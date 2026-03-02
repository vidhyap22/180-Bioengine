import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Platform } from "react-native";
import Colors from "../constants/Colors";
import { supabase } from "../utils/supabaseClient";
import LoadingIndicator from "./common/LoadingIndicator";
import Button from "./common/Button";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Toast } from "toastify-react-native";

const ResetPasswordScreen = ({ navigation, route }) => {
	const initialEmail = route?.params?.email ?? "";
	const [email, setEmail] = useState(initialEmail);
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const canSubmit = useMemo(() => {
		return email.trim() && code.trim() && password && confirmPassword && password === confirmPassword;
	}, [email, code, password, confirmPassword]);

	const handleResetPassword = async () => {
		const trimmedEmail = email.trim();
		const trimmedCode = code.trim();

		// Check valid inputs
		if (!trimmedEmail) {
			Toast.error("Please enter your email");
			return;
		}

		if (!trimmedCode) {
			Toast.error("Please enter the code from your email");
			return;
		}

		if (!password || !confirmPassword) {
			Toast.error("Please enter and confirm your new password");
			return;
		}

		if (password !== confirmPassword) {
			Toast.error("Passwords do not match");
			return;
		}

		try {
			// exchange access code for session
			const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
				email: trimmedEmail,
				token: trimmedCode,
				type: "email",
			});

			if (verifyError) throw verifyError;

			const { error: updateError } = await supabase.auth.updateUser({ password });
			if (updateError) throw updateError;

			await supabase.auth.signOut();
			Toast.success("Password reset. Please log in with your new password.");
			setTimeout(() => navigation.navigate("Login"), 700);
		} catch (error) {
			Toast.error(error?.message ?? "Failed to reset password");
		} finally {
			setLoading(false);
		}
	};
	if (loading) return <LoadingIndicator text="Resetting Password..." fullScreen />;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Reset Password</Text>
			</View>

			<ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
				<Text style={styles.subtitle}>Enter the code you received and choose a new password</Text>

				<View style={styles.inputContainer}>
					<Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput
						style={styles.input}
						placeholder="Email"
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						keyboardType="email-address"
					/>
				</View>

				<View style={styles.inputContainer}>
					<Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput style={styles.input} placeholder="Code" value={code} onChangeText={setCode} keyboardType="number-pad" />
				</View>

				<View style={styles.inputContainer}>
					<Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput style={styles.input} placeholder="New Password" value={password} onChangeText={setPassword} secureTextEntry />
				</View>

				<View style={styles.inputContainer}>
					<Ionicons name="shield-checkmark-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
				</View>

				<Button
					title="Reset Password"
					onPress={handleResetPassword}
					disabled={!canSubmit || loading}
					loading={loading}
					size="large"
					style={styles.button}
				/>
			</ScrollView>
		</View>
	);
};
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: Colors.white },
	header: { flexDirection: "row", alignItems: "center", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
	title: { fontSize: 24, fontWeight: "bold", color: Colors.lightNavalBlue },
	formScroll: { flex: 1 },
	formContent: { padding: 20 },
	subtitle: { fontSize: 16, color: "#666", marginBottom: 30 },
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 25,
		marginBottom: 15,
		paddingHorizontal: 20,
		backgroundColor: "#f8f9fa",
	},
	inputIcon: { marginRight: 10 },
	input: { flex: 1, height: 50, fontSize: 16 },
	button: { marginTop: 20 },
});
export default ResetPasswordScreen;
