import React, { useEffect, useState } from "react";
import { StatusBar, View, Text, ActivityIndicator } from "react-native";
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
    const [error, setError] = useState(null);

    useEffect(() => {
        initDb()
            .then(() => setDbReady(true))
            .catch(err => {
                console.error("Database Init Error:", err);
                setError(err.message || String(err));
            });
    }, []);

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
                <Ionicons name="alert-circle" size={64} color="#ef4444" />
                <Text style={{ marginTop: 20, fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>Startup Error</Text>
                <Text style={{ marginTop: 10, fontSize: 14, color: '#6b7280', textAlign: 'center' }}>{error}</Text>
                <TouchableOpacity 
                    style={{ marginTop: 30, backgroundColor: '#1e3a8a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                    onPress={() => { setError(null); initDb().then(() => setDbReady(true)).catch(setError); }}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!dbReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text style={{ marginTop: 20, fontSize: 16, color: '#666' }}>Initializing Database...</Text>
            </View>
        );
    }



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
