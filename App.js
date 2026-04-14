import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import DashboardPage from "./components/DashboardPage";
import PatientListScreen from "./components/PatientListScreen";
import SessionsScreen from "./components/SessionsScreen";
import ProfileScreen from "./components/ProfileScreen";
import AddPatientScreen from "./components/AddPatientScreen";
import PatientDetailScreen from "./components/PatientDetailScreen";
import EditPatientScreen from "./components/EditPatientScreen";
import TestScreen from "./components/TestScreen";
import TestDetailScreen from "./components/TestDetailScreen";
import MediaPlayer from "./components/MediaPlayer";
import { DialogProvider } from "./components/common/DialogProvider";
import { PaperProvider } from "react-native-paper";
import ToastManager from "toastify-react-native";
import EditProfileScreen from "./components/EditProfileScreen";

import { initDb } from "./nasomeater_storage/database/database"; //changed from "./database/database"



const Stack = createNativeStackNavigator();

export default function App() {
    const [dbReady, setDbReady] = useState(false);

    useEffect(() => {
        initDb().then(() => setDbReady(true)).catch(console.error);
    }, []);

    if (!dbReady) return null;


	return (
		<SafeAreaProvider>
			<PaperProvider>
				<DialogProvider>
					<StatusBar barStyle="dark-content" />
					<NavigationContainer>
						<Stack.Navigator screenOptions={{ headerShown: false }}>
							<Stack.Screen name="Dashboard" component={DashboardPage} />
							<Stack.Screen name="HomeTab" component={PatientListScreen} />
							<Stack.Screen name="Sessions" component={SessionsScreen} />
							<Stack.Screen name="Profile" component={ProfileScreen} />
							<Stack.Screen name="AddPatient" component={AddPatientScreen} />
							<Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
							<Stack.Screen name="EditPatient" component={EditPatientScreen} />
							{/* <Stack.Screen name="EditProfile" component={EditProfileScreen} /> */}
							<Stack.Screen name="Test" component={TestScreen} />
							<Stack.Screen name="TestDetail" component={TestDetailScreen} />
							<Stack.Screen name="MediaPlayer" component={MediaPlayer} />
						</Stack.Navigator>
					</NavigationContainer>
					<ToastManager />
				</DialogProvider>
			</PaperProvider>
		</SafeAreaProvider>
	);
}
