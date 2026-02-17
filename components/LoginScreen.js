import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert, Image } from "react-native";
import Colors from "../constants/Colors";
import { supabase } from "../utils/supabaseClient";
import LoadingIndicator from "./common/LoadingIndicator";
import Button from "./common/Button";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get("window");
const arcHeight = 300; // Height of the arc background

const LoginScreen = ({ navigation }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert("Error", "Please fill in all fields");
			return;
		}

		try {
			setLoading(true);

			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				switch (error.code) {
					case "email_not_confirmed":
						Alert.alert("Email Not Verified", "Create and verify an account before logging in.");
						return;

					case "invalid_credentials":
						Alert.alert("Invalid Credentials", "Email or password is incorrect.");
						return;

					default:
						Alert.alert("Error", error.message);
						return;
				}
			}

			// Successful login — navigation handled elsewhere
		} catch (error) {
			Alert.alert("Error", "Something went wrong. Try again.");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <LoadingIndicator text="Signing in..." fullScreen />;
	}

	return (
		<View style={styles.container}>
			{/* Arc Banner with Logo */}
			<View style={styles.arcContainer}>
				<View style={styles.arc} />
				<Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain" />
			</View>

			{/* Welcome Text */}
			<View style={styles.welcomeContainer}>
				<Text style={styles.welcomeSubtitle}>Sign in to continue</Text>
			</View>

			{/* Login Form */}
			<View style={styles.formContainer}>
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
					<Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
				</View>

				<TouchableOpacity style={styles.forgotPassword}>
					<Text style={styles.forgotPasswordText} onPress={() => navigation.navigate("ForgotPassword")}>
						Forgot Password?
					</Text>
				</TouchableOpacity>

				<Button title="Sign In" onPress={handleLogin} disabled={loading} loading={loading} size="large" style={styles.loginButton} />
			</View>

			{/* Sign Up Section */}
			<View style={styles.signupContainer}>
				<View style={styles.dividerContainer}>
					<View style={styles.divider} />
					<Text style={styles.dividerText}>New to nasomEATR?</Text>
					<View style={styles.divider} />
				</View>

				<Button title="Create an Account" onPress={() => navigation.navigate("Signup")} variant="secondary" size="large" style={styles.signupButton} />
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.white,
	},
	arcContainer: {
		height: arcHeight,
		alignItems: "center",
		overflow: "hidden",
		position: "relative",
	},
	arc: {
		position: "absolute",
		top: -arcHeight * 2,
		width: width * 1.2,
		height: width * 2.2,
		borderRadius: width * 1.5, // Half of width/height
		backgroundColor: Colors.lightNavalBlue,
		alignSelf: "center",
		transform: [{ scaleX: 1.8 }], // Increased from 1.5 to 1.8 for more horizontal stretch
	},
	logo: {
		width: 225,
		height: 225,
		marginTop: 80, // Increased from 40 to 80 to move logo lower
		zIndex: 1,
	},
	welcomeContainer: {
		alignItems: "center",
		marginBottom: 30,
	},
	welcomeTitle: {
		fontSize: 28,
		fontWeight: "bold",
		color: Colors.lightNavalBlue,
		marginBottom: 8,
	},
	welcomeSubtitle: {
		fontSize: 16,
		color: "#666",
	},
	formContainer: {
		width: "100%",
		paddingHorizontal: 20,
	},
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
	inputIcon: {
		marginRight: 10,
	},
	input: {
		flex: 1,
		height: 50,
		fontSize: 16,
	},
	forgotPassword: {
		alignSelf: "flex-end",
		marginBottom: 20,
	},
	forgotPasswordText: {
		color: Colors.lightNavalBlue,
		fontSize: 14,
	},
	loginButton: {
		marginTop: 10,
	},
	signupContainer: {
		width: "100%",
		paddingHorizontal: 20,
		marginTop: "auto",
		marginBottom: 30,
	},
	dividerContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
	},
	divider: {
		flex: 1,
		height: 1,
		backgroundColor: "#eee",
	},
	dividerText: {
		paddingHorizontal: 10,
		color: "#666",
		fontSize: 14,
	},
	signupButton: {
		width: "100%",
	},
});

export default LoginScreen;
