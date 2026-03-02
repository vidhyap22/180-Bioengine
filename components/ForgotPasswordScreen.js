import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView } from "react-native";
import Colors from "../constants/Colors";
import { supabase } from "../utils/supabaseClient";
import LoadingIndicator from "./common/LoadingIndicator";
import Button from "./common/Button";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Toast } from "toastify-react-native";

const ForgotPasswordScreen = ({ navigation }) => {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSendCode = async () => {
		const trimmedEmail = email.trim();

		if (!trimmedEmail) {
			Toast.error("Please enter your email");
			return;
		}

		try {
			setLoading(true);

			const { error } = await supabase.auth.signInWithOtp({
				email: trimmedEmail,
				options: { shouldCreateUser: false },
			});

			if (error) throw error;

			Toast.success("If an account exists, you will receive an email with a code shortly.");

			navigation.navigate("ResetPassword", { email: trimmedEmail });
		} catch (error) {
			Toast.error(error?.message ?? "Failed to send code");
		} finally {
			setLoading(false);
		}
	};

	if (loading) return <LoadingIndicator text="Sending Code..." fullScreen />;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
					<Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
				</TouchableOpacity>
				<Text style={styles.title}>Forgot Password</Text>
			</View>

			<ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
				<Text style={styles.subtitle}>Enter your email address to receive a reset code</Text>

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

				<Button title="Send Code" onPress={handleSendCode} disabled={loading} loading={loading} size="large" style={styles.button} />
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: Colors.white },
	header: { flexDirection: "row", alignItems: "center", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
	backButton: { marginRight: 10 },
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

export default ForgotPasswordScreen;
