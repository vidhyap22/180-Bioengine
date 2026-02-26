import React, { useState, useEffect } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "./utils/supabaseClient";
import LoginScreen from "./components/LoginScreen";
import SignupScreen from "./components/SignupScreen";
import DashboardPage from "./components/DashboardPage";
import VerificationScreen from "./components/VerificationScreen";
import PatientListScreen from "./components/PatientListScreen";
import SessionsScreen from "./components/SessionsScreen";
import ProfileScreen from "./components/ProfileScreen";
import AddPatientScreen from "./components/AddPatientScreen";
import PatientDetailScreen from "./components/PatientDetailScreen";
import EditPatientScreen from "./components/EditPatientScreen";
import TestScreen from "./components/TestScreen";
import TestDetailScreen from "./components/TestDetailScreen";
import MediaPlayer from "./components/MediaPlayer";
import ResetPassword from "./components/ResetPasswordScreen";
import ForgotPassword from "./components/ForgotPasswordScreen";
import { DialogProvider } from "./components/common/DialogProvider";
import { PaperProvider } from "react-native-paper";
import ToastManager from "toastify-react-native";
const Stack = createNativeStackNavigator();

export default function App() {
	const [session, setSession] = useState(null);
	const [isEmailVerified, setIsEmailVerified] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		const checkSession = async () => {
			const { data } = await supabase.auth.getSession();
			setSession(data.session);
			if (data.session?.user?.email_confirmed_at) {
				setIsEmailVerified(true);
			} else {
				setIsEmailVerified(false);
			}
			setIsInitialized(true);
		};

		checkSession();

		const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			if (session?.user?.email_confirmed_at) {
				setIsEmailVerified(true);
			} else {
				setIsEmailVerified(false);
			}
		});

		return () => {
			authListener.subscription.unsubscribe();
		};
	}, []);

	if (!isInitialized) {
		return null; // or a loading spinner
	}

	return (
		<SafeAreaProvider>
			<PaperProvider>
				<DialogProvider>
					<StatusBar barStyle="dark-content" />
					<NavigationContainer>
						<Stack.Navigator screenOptions={{ headerShown: false }}>
							{!session ? (
								<>
									<Stack.Screen name="Login" component={LoginScreen} />
									<Stack.Screen name="Signup" component={SignupScreen} />
									<Stack.Screen name="ForgotPassword" component={ForgotPassword} />
									<Stack.Screen name="ResetPassword" component={ResetPassword} />
								</>
							) : !isEmailVerified ? (
								<Stack.Screen name="Verification" component={VerificationScreen} />
							) : (
								<>
									<Stack.Screen name="Dashboard" component={DashboardPage} />
									<Stack.Screen name="HomeTab" component={PatientListScreen} />
									<Stack.Screen name="Sessions" component={SessionsScreen} />
									<Stack.Screen name="Profile" component={ProfileScreen} />
									<Stack.Screen name="AddPatient" component={AddPatientScreen} />
									<Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
									<Stack.Screen name="EditPatient" component={EditPatientScreen} />
									<Stack.Screen name="Test" component={TestScreen} />
									<Stack.Screen name="TestDetail" component={TestDetailScreen} />
									<Stack.Screen name="MediaPlayer" component={MediaPlayer} />
								</>
							)}
						</Stack.Navigator>
					</NavigationContainer>
					<ToastManager />
				</DialogProvider>
			</PaperProvider>
		</SafeAreaProvider>
	);
}
