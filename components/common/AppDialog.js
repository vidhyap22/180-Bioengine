import React from "react";
import { StyleSheet, View } from "react-native";
import { Portal, Dialog, Button, Text } from "react-native-paper";
import Colors from "../../constants/Colors"; // adjust path if needed

export default function AppDialog({ visible, title, message, actions, onDismiss, kind = "default" }) {
	const isError = kind === "error";
	const isSuccess = kind === "success";

	const headerBarStyle = [styles.headerBar, isError && styles.headerBarError, isSuccess && styles.headerBarSuccess];

	return (
		<Portal>
			<Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
				<View style={headerBarStyle} />

				{!!title && <Dialog.Title style={styles.title}>{title}</Dialog.Title>}

				{!!message && (
					<Dialog.Content>
						<Text style={styles.message}>{message}</Text>
					</Dialog.Content>
				)}

				<Dialog.Actions style={styles.actions}>
					{(actions || []).map((a, idx) => {
						const isDestructive = a.variant === "destructive";
						const isCancel = a.variant === "cancel";

						const isLast = idx === (actions || []).length - 1;
						const makePrimary = isError && isLast && !isCancel && !isDestructive;

						const mode = isDestructive ? "contained" : makePrimary ? "contained" : "text";

						const buttonColor = mode === "contained" ? (isDestructive ? "#D92D20" : Colors.lightNavalBlue) : undefined;

						const textColor = mode === "text" ? (isCancel ? "rgba(0,0,0,0.55)" : isDestructive ? "#D92D20" : Colors.lightNavalBlue) : Colors.white; // contained label
						return (
							<Button
								key={`${a.label}-${idx}`}
								disabled={!!a.disabled}
								mode={mode}
								buttonColor={buttonColor}
								textColor={textColor}
								style={styles.button}
								contentStyle={styles.buttonContent}
								onPress={async () => {
									onDismiss?.();
									if (a.onPress) await a.onPress();
								}}
							>
								{a.label}
							</Button>
						);
					})}
				</Dialog.Actions>
			</Dialog>
		</Portal>
	);
}

const styles = StyleSheet.create({
	dialog: {
		backgroundColor: Colors.lightGray,
		borderRadius: 18,
		overflow: "hidden",
	},

	headerBar: {
		height: 6,
	},
	headerBarDefault: {
		backgroundColor: "rgba(58,94,140,0.35)",
	},
	headerBarError: {
		backgroundColor: "#D92D20",
	},
	headerBarSuccess: {
		backgroundColor: "#16A34A",
	},

	title: {
		fontSize: 18,
		fontWeight: "800",
		marginTop: 8,
		color: "#111",
	},

	message: {
		fontSize: 15,
		lineHeight: 20,
		color: Colors.lightNavalBlue,
	},

	actions: {
		paddingHorizontal: 12,
		paddingBottom: 12,
		paddingTop: 6,
		flexDirection: "row",
		justifyContent: "flex-end",
	},

	buttonBase: {
		marginLeft: 8,
		borderRadius: 12,
	},

	buttonContent: {
		height: 40,
		paddingHorizontal: 12,
	},

	primaryTextButton: {
		backgroundColor: "transparent",
	},

	primaryContainedButton: {
		backgroundColor: Colors.lightNavalBlue,
	},

	destructiveButton: {
		backgroundColor: "#D92D20",
	},

	cancelButton: {
		backgroundColor: "transparent",
	},

	blueRipple: {
		color: "rgba(58,94,140,0.18)",
	},

	redRipple: {
		color: "rgba(217,45,32,0.18)",
	},
});
