import * as FileSystem from "expo-file-system/legacy";

// File structure
export const STORAGE_ROOT = `${FileSystem.documentDirectory}nasometer_storage/`;
export const DATABASE_DIR = `${STORAGE_ROOT}database/`;
export const PATIENTS_DIR = `${STORAGE_ROOT}patients/`;

// File/Dir path helpers
export const getDatabasePath = () => `${DATABASE_DIR}app.db`;

export const getPatientDir = (patientId) => `${PATIENTS_DIR}${patientId}/`;

export const getPatientProfileDir = (patientId) => `${getPatientDir(patientId)}profile/`;

export const getPatientTestsDir = (patientId) => `${getPatientDir(patientId)}tests/`;

export const getTestDir = (patientId, testId) => `${getPatientTestsDir(patientId)}${testId}/`;

export const getTestStereoPath = (patientId, testId) => `${getTestDir(patientId, testId)}stereo_recording.pcm`;

export const getTestNasalPath = (patientId, testId) => `${getTestDir(patientId, testId)}nasal_audio.pcm`;

export const getTestOralPath = (patientId, testId) => `${getTestDir(patientId, testId)}oral_audio.pcm`;

export const getPatientPicturePath = (patientId, extension = "jpg") => `${getPatientProfileDir(patientId)}picture.${extension}`;

// Appropriate file structure checks
export const checkDirExists = async (dirPath) => {
    const info = await FileSystem.getInfoAsync(dirPath);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
};

export const checkStorageStructure = async () => {
    await checkDirExists(STORAGE_ROOT);
    await checkDirExists(DATABASE_DIR);
    await checkDirExists(PATIENTS_DIR);
};

export const checkPatientStructure = async (patientId) => {
    await checkStorageStructure();
    await checkDirExists(getPatientDir(patientId));
    await checkDirExists(getPatientProfileDir(patientId));
    await checkDirExists(getPatientTestsDir(patientId));
};

export const checkTestStructure = async (patientId, testId) => {
    await checkPatientStructure(patientId);
    await checkDirExists(getTestDir(patientId, testId));
};
