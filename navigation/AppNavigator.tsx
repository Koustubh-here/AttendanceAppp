import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";

import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfessorDashboard from "../screens/ProfessorDashboard";
import StudentDashboard from "../screens/StudentDashboard";
import ViewAttendance from "../screens/ViewAttendance";
import ScheduleScreen from "../screens/ScheduleScreen"; // Add this
import CoursesScreen from "../screens/CoursesScreen"; // Add this
import ProfileScreen from "../screens/ProfileScreen"; // Add this
import StudentsScreen from "../screens/StudentsScreen";
import ClassesScreen from "../screens/ClassesScreen"; // Add this
import AttendanceLook from "../screens/AttendanceLook";
import AttendanceView from "../screens/AttendanceView"; // Add this
// Navigation route names as constants
export const ROUTES = {
  WELCOME: "Welcome",
  LOGIN: "LoginScreen",
  STUDENT_DASHBOARD: "StudentDashboard",
  PROFESSOR_DASHBOARD: "ProfessorDashboard",
  VIEW_ATTENDANCE: "ViewAttendance",
  SCHEDULE: "Schedule", // Add this
  COURSES: "Courses", // Add this
  PROFILE: "Profile", 
  STUDENTS: "Students",
  CLASSES: "Classes",
  ATTENDANCE_LOOK : "AttendanceLook",
  ATTENDANCE_VIEW : "AttendanceView"// Add this
};

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={ROUTES.WELCOME}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "#1a73e8",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name={ROUTES.WELCOME}
          component={WelcomeScreen}
          options={{ title: "Welcome" }}
        />
        <Stack.Screen
          name={ROUTES.LOGIN}
          component={LoginScreen}
          options={({ route }) => ({
            title: `${route.params?.role || ""} Login`,
          })}
        />
        <Stack.Screen
          name={ROUTES.PROFESSOR_DASHBOARD}
          component={ProfessorDashboard}
          options={{ title: "Professor Dashboard", headerLeft: null }}
        />
        <Stack.Screen
          name={ROUTES.STUDENT_DASHBOARD}
          component={StudentDashboard}
          options={{ title: "Student Dashboard", headerLeft: null }}
        />
        <Stack.Screen
          name={ROUTES.VIEW_ATTENDANCE}
          component={ViewAttendance}
          options={{ title: "Attendance Records" }}
        />
        <Stack.Screen
          name={ROUTES.SCHEDULE}
          component={ScheduleScreen}
          options={{ title: "Schedule" }}
        />
        <Stack.Screen
          name={ROUTES.COURSES}
          component={CoursesScreen}
          options={{ title: "My Courses" }}
        />
        <Stack.Screen
          name={ROUTES.PROFILE}
          component={ProfileScreen}
          options={{ title: "Profile" }}
        />

        <Stack.Screen
          name={ROUTES.STUDENTS}
          component={StudentsScreen}
          options={{ title: "Students" }}
        />

        <Stack.Screen
          name={ROUTES.CLASSES}
          component={ClassesScreen}
          options={{ title: "Classes" }}
        />

        <Stack.Screen
          name={ROUTES.ATTENDANCE_LOOK}
          component={AttendanceLook}
          options={{ title: "AttendanceLook" }}
        />

        <Stack.Screen
          name={ROUTES.ATTENDANCE_VIEW}
          component={AttendanceView}
          options={{ title: "AttendanceView" }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}