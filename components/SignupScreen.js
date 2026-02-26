import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Dimensions, Alert, TouchableOpacity, ScrollView } from "react-native";
import Colors from "../constants/Colors";
import { supabase } from "../utils/supabaseClient";
import LoadingIndicator from "./common/LoadingIndicator";
import Button from "./common/Button";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Toast } from "toastify-react-native";

const SignupScreen = ({ navigation }) => {
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSignup = async () => {
		if (password !== confirmPassword) {
			Toast.error("Passwords do not match");
			return;
		}

		if (!email || !password || !fullName || !username) {
			Toast.error("Please fill in all fields");
			return;
		}

		try {
			setLoading(true);

			const { error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: fullName,
						username: username,
					},
				},
			});

			if (error) {
				throw error;
			}

			Toast.success("Please check your email for verification link");
			setTimeout(() => navigation.navigate("Login"), 700);
		} catch (error) {
			Toast.error(error?.message || "Failed to create account");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <LoadingIndicator text="Creating account..." fullScreen />;
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
					<Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
				</TouchableOpacity>
				<Text style={styles.title}>Create Account</Text>
			</View>

			<ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
				<Text style={styles.subtitle}>Please fill in the form to continue</Text>

				<View style={styles.inputContainer}>
					<Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
				</View>

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
					<Ionicons name="at-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
				</View>

				<View style={styles.inputContainer}>
					<Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
				</View>

				<View style={styles.inputContainer}>
					<Ionicons name="shield-checkmark-outline" size={20} color="#666" style={styles.inputIcon} />
					<TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
				</View>

				<Button title="Create Account" onPress={handleSignup} disabled={loading} loading={loading} size="large" style={styles.button} />
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.white,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingTop: 60,
		paddingBottom: 20,
		paddingHorizontal: 20,
	},
	backButton: {
		marginRight: 10,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: Colors.lightNavalBlue,
	},
	formScroll: {
		flex: 1,
	},
	formContent: {
		padding: 20,
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginBottom: 30,
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
	button: {
		marginTop: 20,
	},
});

export default SignupScreen;
