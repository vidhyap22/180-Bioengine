// inmp441 i2s dual mic @ 48khz

#include <WebServer.h>
#include <WebSocketsServer.h> // WebSockets by markus Sattler
#include <WiFi.h>
#include <driver/i2s.h>

// wifi name & pass
const char *ssid = "esp32";
const char *password = "12345678";

// i2s pins
#define I2S_BCLK 26
#define I2S_WS 25
#define I2S_SD 32
// left mic = ground
// right mic = 3.3V

// audio sample rate
#define sample_rate_hz 22050
#define buffer_samples 256
#define I2S_PORT I2S_NUM_0

int32_t i2sBuffer[buffer_samples * 2];

// websocket config
WebServer server(80);
WebSocketsServer webSocket(81);

// recording state machine
enum RecState { IDLE, RECORDING, PAUSED };
volatile RecState recState = IDLE;

// i2s setup
// ref:
// https://docs.espressif.com/projects/esp-idf/en/v4.4/esp32s3/api-reference/peripherals/i2s.html
void setupI2S() {

  i2s_config_t i2s_config = {.mode =
                                 (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
                             .sample_rate = sample_rate_hz,
                             .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
                             .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
                             .communication_format = I2S_COMM_FORMAT_I2S,
                             .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
                             .dma_buf_count = 8,
                             .dma_buf_len = buffer_samples,
                             .use_apll = true,
                             .tx_desc_auto_clear = false,
                             .fixed_mclk = 0};

  i2s_pin_config_t pin_config = {.bck_io_num = I2S_BCLK,
                                 .ws_io_num = I2S_WS,
                                 .data_out_num = I2S_PIN_NO_CHANGE,
                                 .data_in_num = I2S_SD};

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_set_clk(I2S_PORT, sample_rate_hz, I2S_BITS_PER_SAMPLE_32BIT,
              I2S_CHANNEL_STEREO);
}

// websocket
void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload,
                    size_t length) {

  if (type != WStype_TEXT)
    return;

  String msg = (char *)payload;

  if (msg == "START") {
    if (recState == IDLE || recState == PAUSED) {
      recState = RECORDING;
    }
  }

  else if (msg == "PAUSE") {
    if (recState == RECORDING) {
      recState = PAUSED;
    }
  }

  else if (msg == "STOP") {
    recState = IDLE;
  }
}

// webpage
// sourced from chatgpt :3
void handleRoot() {

  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: Arial; text-align:center; }
button { padding:10px 20px; margin:5px; }
canvas { border:1px solid black; width:90%; height:150px; }
</style>
</head>
<body>

<h2>ESP32 Dual INMP441 Recorder (22.05kHz)</h2>

<button onclick="start()">Start</button>
<button onclick="pause()">Pause</button>
<button onclick="stopRec()">Stop</button>
<button onclick="save()">Save WAV</button>

<br><br>

<canvas id="wave1" width="1000" height="150"></canvas><br>
<canvas id="wave2" width="1000" height="150"></canvas>

<script>

let ws = new WebSocket("ws://" + location.hostname + ":81/");
let state = "IDLE"; // IDLE, RECORDING, PAUSED

ws.binaryType = "arraybuffer";

let left = [];
let right = [];

ws.onmessage = e => {
  if (state !== "RECORDING") return;

  let data = new Int32Array(e.data);

  for (let i = 0; i < data.length; i += 2) {
    right.push(data[i] >> 14);
    left.push(data[i + 1] >> 14);
  }

  draw("wave1", left);
  draw("wave2", right);
};


function start(){
  if (state === "IDLE") {
    left = [];
    right = [];
  }
  state = "RECORDING";
  ws.send("START");
}

function pause(){
  state = "PAUSED";
  ws.send("PAUSE");
}

function stopRec(){
  state = "IDLE";
  ws.send("STOP");
}


function draw(id, samples){
  let c = document.getElementById(id);
  let x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  x.beginPath();

  let step = Math.max(1, Math.floor(samples.length / c.width));
  for (let i = 0; i < c.width; i++) {
    let s = samples[i * step] || 0;
    let y = (s + 32768) / 65536 * c.height;
    x.lineTo(i, y);
  }
  x.stroke();
}

function save(){
  wav("left.wav", left);
  wav("right.wav", right);
}

function wav(name, s){
  let b = new ArrayBuffer(44 + s.length * 2);
  let v = new DataView(b);

  let w = (o, t) => {
    for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i));
  };

  w(0,"RIFF");
  v.setUint32(4,36 + s.length * 2,true);
  w(8,"WAVEfmt ");
  v.setUint32(16,16,true);
  v.setUint16(20,1,true);
  v.setUint16(22,1,true);
  v.setUint32(24,22050,true);
  v.setUint32(28,44100,true);
  v.setUint16(32,2,true);
  v.setUint16(34,16,true);
  w(36,"data");
  v.setUint32(40,s.length * 2,true);

  let o = 44;
  s.forEach(x => {
    v.setInt16(o, x, true);
    o += 2;
  });

  let a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([v], {type:"audio/wav"}));
  a.download = name;
  a.click();
}

</script>

</body>
</html>
)rawliteral";

  server.send(200, "text/html", html);
}

void setup() {
  Serial.begin(115200);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);

  setupI2S();

  server.on("/", handleRoot);
  server.begin();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  Serial.println("Open browser at http://192.168.4.1");
}

void loop() {

  webSocket.loop();
  server.handleClient();

  if (recState != RECORDING)
    return;

  size_t bytesRead;
  i2s_read(I2S_PORT, i2sBuffer, sizeof(i2sBuffer), &bytesRead, portMAX_DELAY);

  webSocket.broadcastBIN((uint8_t *)i2sBuffer, bytesRead);
}