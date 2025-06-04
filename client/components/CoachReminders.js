import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert,
    Platform, ActivityIndicator, Modal, TextInput, Pressable, Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Notifications from 'expo-notifications';
import ProHeader from './ProHeader';
import ProTabNavigation from './ProTabNavigation';
import { AuthContext } from './AuthContext';
import { getFirestore, doc, collection, getDocs, writeBatch, Timestamp, query, orderBy } from "firebase/firestore";
import { firebaseApp } from '../firebaseConfig';


const PALETTE = { darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3', white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555', errorRed: '#D32F2F', declineRed: '#F44336', nextButtonBackground: '#2E4A32', nextButtonText: '#FFFFFF', buttonBorder: '#E0E0E0', addBtnBackground: '#4CAF50', addBtnText: '#FFFFFF', modalBackground: 'rgba(0, 0, 0, 0.6)', modalButtonCancelText: '#555555', modalButtonAddText: '#FFFFFF', linkColor: '#007AFF' };
const SIZES = { labelFont: 15, titleFont: 16, inputFont: 15, paddingHorizontal: 15, cardPadding: 15, cardMarginBottom: 15, optionButtonBorderRadius: 20, rowVerticalPadding: 12, iconSize: 24, inputPaddingVertical: 10, inputPaddingHorizontal: 12, modalTitleFont: 18, modalButtonFont: 15, modalBorderRadius: 15, modalPadding: 20, modalButtonHeight: 44 };

const formatTime = (date) => { if (!date || !(date instanceof Date)) return 'Set Time'; let h = date.getHours().toString().padStart(2, '0'); let m = date.getMinutes().toString().padStart(2, '0'); return `${h}:${m}`; };
const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, }), });
const db = getFirestore(firebaseApp);

const CoachReminders = () => {
    const navigation = useNavigation();
    const { user: coach } = useContext(AuthContext) || {};
    const [reminders, setReminders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [loadError, setLoadError] = useState('');
    const [permissionsGranted, setPermissionsGranted] = useState(null); 
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [currentReminderId, setCurrentReminderId] = useState(null);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [newReminderName, setNewReminderName] = useState('');
    const [newReminderTime, setNewReminderTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
    const [showNewTimePicker, setShowNewTimePicker] = useState(false);

    const requestAndSetPermissions = useCallback(async () => {
        console.log("[CoachReminders Perms] Requesting notification permissions...");
        let granted = false;
        try {
            if (Platform.OS === 'android') { await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C', }); }
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            console.log(`[CoachReminders Perms] Existing status: ${existingStatus}`);
            if (existingStatus !== 'granted') {
                console.log("[CoachReminders Perms] Existing status not granted, requesting new permissions...");
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                console.log(`[CoachReminders Perms] New status received: ${finalStatus}`);
            }
            granted = finalStatus === 'granted';
            if (!granted) { console.warn("[CoachReminders Perms] Permissions NOT granted by user."); }
             else { console.log("[CoachReminders Perms] Permissions successfully granted."); }
        } catch (e) { console.error("[CoachReminders Perms] Error getting/requesting permissions:", e); Alert.alert("Notification Error", "Could not configure notifications. Please check your device settings."); }
        setPermissionsGranted(granted);
    }, []);

    useEffect(() => {
        requestAndSetPermissions();
        const nL = Notifications.addNotificationReceivedListener(n => console.log("N:", n?.request?.content?.data));
        const rL = Notifications.addNotificationResponseReceivedListener(r => console.log("R:", r?.notification?.request?.content?.data));
        return () => { Notifications.removeNotificationSubscription(nL); Notifications.removeNotificationSubscription(rL); };
    }, [requestAndSetPermissions]);

    const loadReminders = useCallback(async () => {
        if (!coach?.uid) { setIsLoading(false); setLoadError("Login required."); return; }
        console.log(`[CoachReminders Load] For coach ${coach.uid}`);
        setIsLoading(true); setLoadError(''); setSaveError('');
        try {
            const remindersColRef = collection(db, 'nutritionists', coach.uid, 'reminders');
            const q = query(remindersColRef, orderBy("time", "asc"));
            const snapshot = await getDocs(q);
            const loaded = snapshot.docs.map(ds => ({ id: ds.id, ...ds.data(), time: ds.data().time?.toDate ? ds.data().time.toDate() : null }));
            setReminders(loaded);
        } catch (e) { console.error("[CoachReminders Load] Error:", e); setLoadError(`Load failed: ${e.message}`); }
        finally { setIsLoading(false); }
    }, [coach?.uid]);

    useEffect(() => { if (coach?.uid) loadReminders(); else setIsLoading(false); }, [coach?.uid, loadReminders]);

    async function scheduleReminderNotification(reminder) {
        if (!permissionsGranted || !reminder.enabled || !reminder.time || !(reminder.time instanceof Date) || isNaN(reminder.time)) return null;
        const h = reminder.time.getHours(); const m = reminder.time.getMinutes();
        const identifier = String(reminder.id);
        try {
            await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
            return await Notifications.scheduleNotificationAsync({ identifier, content: { title: "BiteWise Reminder", body: `Time for: ${reminder.name}`, sound: 'default', data: { reminderId: reminder.id } }, trigger: { hour: h, minute: m, repeats: true } });
        } catch (e) { console.error(`[Schedule] Fail ${reminder.name}:`, e); return null; }
    }
    async function cancelSpecificNotification(id) {
        if (!id || String(id).startsWith('local_')) return;
        try { await Notifications.cancelScheduledNotificationAsync(String(id)); } catch (e) { console.error(`[Cancel] Fail ${id}:`, e); }
    }
    async function cancelAllScheduledNotifications() {
        try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) { console.error("[Cancel All] Failed:", e); }
    }

    const onTimeChange = (event, selectedDate) => {
        const isIOS = Platform.OS === 'ios'; if (!isIOS) setShowTimePicker(false);
        if (selectedDate && event.type !== 'dismissed') {
            const newTime = new Date(); newTime.setHours(selectedDate.getHours()); newTime.setMinutes(selectedDate.getMinutes()); newTime.setSeconds(0,0);
            setReminders(p => p.map(r => r.id === currentReminderId ? { ...r, time: newTime } : r));
            if (!isIOS) setCurrentReminderId(null);
        } else if (!isIOS) setCurrentReminderId(null);
    };
    const handleExistingIosPickerDone = () => { setShowTimePicker(false); setCurrentReminderId(null); };
    const showTimePickerFor = (id) => { setCurrentReminderId(id); setShowTimePicker(true); };
    const toggleSwitch = (id) => { setReminders(p => p.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)); };

    const handleAddReminder = () => {
        console.log(">>> handleAddReminder triggered. Permissions granted:", permissionsGranted);
        if (!permissionsGranted) {
            Alert.alert("Permissions Needed", "Please enable notifications in your device settings to add reminders.", [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() }
            ]);
            requestAndSetPermissions(); 
            return;
        }
        console.log("[UI Add] Opening Add Reminder modal.");
        setNewReminderName(''); setNewReminderTime(new Date(new Date().setHours(9, 0, 0, 0)));
        setIsAddModalVisible(true); setShowNewTimePicker(false);
    };
    const onNewTimeChange = (event, selectedDate) => {const ios = Platform.OS === 'ios'; if(!ios) setShowNewTimePicker(false); if(selectedDate && event.type !== 'dismissed') { const t = new Date(); t.setHours(selectedDate.getHours()); t.setMinutes(selectedDate.getMinutes()); t.setSeconds(0,0); setNewReminderTime(t); }};
    const handleNewIosPickerDone = () => { setShowNewTimePicker(false); };
    const confirmAddReminder = () => {
        console.log(">>> confirmAddReminder triggered");
        const name = newReminderName.trim(); if (!name || !newReminderTime) { Alert.alert("Info Required", "Name and time are required."); return; }
        const newReminder = { id: generateLocalId(), name, time: newReminderTime, enabled: true };
        setReminders(p => [...p, newReminder].sort((a,b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0) ));
        console.log("[UI Add] Added to local state:", newReminder.name);
        setIsAddModalVisible(false); setShowNewTimePicker(false);
    };
    const handleDeleteReminder = (idToDelete) => {
        const r = reminders.find(rem => rem.id === idToDelete); if(!r) return;
        Alert.alert( "Delete", `Delete "${r.name}"?`, [{text:"Cancel"},{text:"Delete",style:"destructive",onPress:async()=>{setReminders(p=>p.filter(rem=>rem.id!==idToDelete)); await cancelSpecificNotification(idToDelete); console.log(`[UI Delete] ${idToDelete} removed locally.`);}}]);
    };

    const handleSaveChanges = async () => {
        console.log(">>> handleSaveChanges triggered. Permissions granted:", permissionsGranted);
        if (!coach?.uid) { Alert.alert("Error", "Cannot save: Not authenticated."); return; }
        if (!permissionsGranted) { Alert.alert("Permissions Needed", "Please enable notifications in settings to save reminders.", [{text:"OK"}, {text: "Open Settings", onPress: Linking.openSettings}]); requestAndSetPermissions(); return; }

        setIsSaving(true); setSaveError('');
        console.log("[CoachReminders Save] Saving to Firestore. Reminders:", reminders.map(r=>r.name));
        try {
            await cancelAllScheduledNotifications();
            const remindersColRef = collection(db, 'nutritionists', coach.uid, 'reminders');
            const batch = writeBatch(db);
            const oldSnapshot = await getDocs(remindersColRef);
            oldSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
            let newRemindersForState = [];
            reminders.forEach((reminder) => {
                if (reminder.time instanceof Date && !isNaN(reminder.time)) {
                    const newDocRef = doc(collection(db, 'nutritionists', coach.uid, 'reminders'));
                    batch.set(newDocRef, { name: reminder.name, enabled: reminder.enabled, time: Timestamp.fromDate(reminder.time) });
                    newRemindersForState.push({ ...reminder, id: newDocRef.id });
                }
            });
            await batch.commit();
            setReminders(newRemindersForState.sort((a,b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0) ));
            let scheduledCount = 0;
            for (const savedReminder of newRemindersForState) { if (savedReminder.enabled && savedReminder.time) { if (await scheduleReminderNotification(savedReminder)) scheduledCount++; } }
            Alert.alert("Settings Saved", `Reminders updated. ${scheduledCount} notifications scheduled.`);
        } catch (error) { console.error("[Save] Error:", error); setSaveError(`Save failed: ${error.message}`); Alert.alert("Error", `Save failed: ${error.message}`); loadReminders(); }
        finally { setIsSaving(false); }
    };

     console.log("[CoachReminders Render] State Check:", {isLoading, isSaving, loadError, saveError, permissionsGranted: String(permissionsGranted), remindersLength: reminders.length});

     if (isLoading || permissionsGranted === null) { return <View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>; }
     if (loadError) { return ( <View style={styles.mainContainer}><ProHeader subtitle="Reminders" onBackPress={() => navigation.goBack()}/><View style={styles.centered}><Text style={styles.errorText}>{loadError}</Text><TouchableOpacity onPress={loadReminders}><Text style={styles.buttonTextRetry}>Retry Load</Text></TouchableOpacity></View><ProTabNavigation /></View> ); }
     if (!coach && !isLoading) { return ( <View style={styles.mainContainer}><ProHeader subtitle="Reminders" onBackPress={() => navigation.goBack()}/><View style={styles.centered}><Text>Please log in.</Text></View><ProTabNavigation /></View> ); }

    return (
        <View style={styles.mainContainer}>
            <ProHeader subtitle="Reminders" onBackPress={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    {reminders.map((reminder) => (
                       <View key={reminder.id} style={styles.reminderRow}>
                            <View style={styles.reminderInfo}><Text style={styles.reminderName}>{reminder.name}</Text><TouchableOpacity onPress={() => showTimePickerFor(reminder.id)} disabled={isSaving}><Text style={styles.reminderTime}>{formatTime(reminder.time)}</Text></TouchableOpacity></View>
                            <View style={styles.actionsContainer}><Switch trackColor={{ false: PALETTE.grey, true: PALETTE.mediumGreen }} thumbColor={reminder.enabled ? PALETTE.darkGreen : PALETTE.lightCream} onValueChange={() => toggleSwitch(reminder.id)} value={reminder.enabled} disabled={isSaving} style={styles.switchStyle}/><TouchableOpacity onPress={() => handleDeleteReminder(reminder.id)} disabled={isSaving}><Icon name="trash-bin-outline" size={SIZES.iconSize} color={PALETTE.declineRed} /></TouchableOpacity></View>
                        </View>
                    ))}
                    {reminders.length === 0 && !isLoading && <Text style={styles.noRemindersText}>No reminders set yet.</Text> }

                    <TouchableOpacity style={[styles.button, styles.addButton, (isSaving || !permissionsGranted) && styles.buttonDisabled]} onPress={handleAddReminder} disabled={isSaving || !permissionsGranted} >
                        <Text style={styles.addButtonText}>+ Add Reminder</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.saveButton, (isSaving || reminders.length === 0 || !permissionsGranted) && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={isSaving || reminders.length === 0 || !permissionsGranted} >
                        {isSaving ? <ActivityIndicator color={PALETTE.white} /> : <Text style={styles.buttonText}>Save Changes</Text>}
                    </TouchableOpacity>

                    {!permissionsGranted && (
                        <View style={styles.permissionWarningContainer}>
                            <Text style={styles.warningText}>Notification permissions are required for reminders.</Text>
                            <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.settingsButton}><Text style={styles.settingsButtonText}>Open Device Settings</Text></TouchableOpacity>
                            <TouchableOpacity onPress={requestAndSetPermissions} style={[styles.settingsButton, {marginTop: 5, backgroundColor: PALETTE.mediumGreen}]}><Text style={styles.settingsButtonText}>Retry Permissions</Text></TouchableOpacity>
                        </View>
                    )}
                    {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
                </View>

                {showTimePicker && currentReminderId && ( <DateTimePicker testID="dtpExisting" value={reminders.find(r=>r.id===currentReminderId)?.time||new Date()} mode="time" is24Hour={true} display={Platform.OS==='ios'?'spinner':'default'} onChange={onTimeChange} /> )}
                {Platform.OS === 'ios' && showTimePicker && ( <TouchableOpacity style={styles.iosPickerDoneButtonAbsolute} onPress={handleExistingIosPickerDone}><Text style={styles.iosPickerDoneText}>Done</Text></TouchableOpacity> )}
            </ScrollView>
            <ProTabNavigation />
            <Modal animationType="fade" transparent={true} visible={isAddModalVisible} onRequestClose={() => setIsAddModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsAddModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={() => {}}>
                        <Text style={styles.modalTitle}>Add New Reminder</Text>
                        <TextInput style={styles.modalInput} placeholder="Reminder Name (e.g., Client Check-in)" placeholderTextColor={PALETTE.grey} value={newReminderName} onChangeText={setNewReminderName} />
                        <Text style={styles.modalLabel}>Time:</Text>
                        <TouchableOpacity style={styles.timeDisplayButton} onPress={() => setShowNewTimePicker(true)}><Text style={styles.timeDisplayText}>{formatTime(newReminderTime)}</Text></TouchableOpacity>
                        {showNewTimePicker && (
                             <View style={styles.newTimePickerContainer}>
                                <DateTimePicker testID="dtpNew" value={newReminderTime} mode="time" is24Hour={true} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onNewTimeChange} />
                                {Platform.OS === 'ios' && (<TouchableOpacity style={styles.iosPickerDoneButton} onPress={handleNewIosPickerDone}><Text style={styles.iosPickerDoneText}>Done</Text></TouchableOpacity> )}
                             </View>
                        )}
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setIsAddModalVisible(false)}><Text style={styles.modalCancelButtonText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.modalAddButton]} onPress={confirmAddReminder}><Text style={styles.modalAddButtonText}>Add Reminder</Text></TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream, }, scrollContent: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 20, paddingBottom: 40, }, card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: SIZES.cardPadding, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, }, reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SIZES.rowVerticalPadding, borderBottomWidth: 1, borderBottomColor: PALETTE.lightCream, minHeight: 60 }, reminderInfo: { flex: 1, marginRight: 10, justifyContent: 'center' }, reminderName: { fontSize: SIZES.labelFont, color: PALETTE.darkGrey, marginBottom: 3, fontWeight: '500', }, reminderTime: { fontSize: SIZES.labelFont - 1, color: PALETTE.mediumGreen, fontWeight: 'bold', }, actionsContainer: { flexDirection: 'row', alignItems: 'center', }, switchStyle: { marginHorizontal: 10, transform: Platform.OS === 'ios' ? [] : [{ scaleX: 1.2 }, { scaleY: 1.2 }] }, noRemindersText: { textAlign: 'center', color: PALETTE.darkGrey, marginVertical: 20, fontSize: SIZES.labelFont }, button: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: SIZES.optionButtonBorderRadius, alignItems: 'center', alignSelf: 'center', marginTop: 20, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, minWidth: '60%', }, addButton: { backgroundColor: PALETTE.addBtnBackground, marginTop: 30, }, addButtonText: { color: PALETTE.addBtnText, fontSize: 16, fontWeight: 'bold', }, saveButton: { backgroundColor: PALETTE.nextButtonBackground, }, buttonDisabled: { backgroundColor: PALETTE.grey, }, buttonText: { color: PALETTE.nextButtonText, fontSize: 16, fontWeight: 'bold', }, errorText: { color: PALETTE.errorRed, textAlign: 'center', marginTop: 15, fontSize: 14, fontWeight: '500' }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream, padding: 20 },
    warningText: { color: PALETTE.darkGrey, textAlign: 'center', fontSize: 13, fontStyle: 'italic', marginBottom: 5 },
    permissionWarningContainer: { marginTop: 15, padding: 10, backgroundColor: PALETTE.white, borderRadius: 10, alignItems: 'center', },
    settingsButton: { marginTop: 10, backgroundColor: PALETTE.darkGreen, paddingVertical: 8, paddingHorizontal: 15, borderRadius: SIZES.optionButtonBorderRadius, },
    settingsButtonText: { color: PALETTE.white, fontWeight: 'bold', fontSize: 14, },
    buttonTextRetry: { color: PALETTE.darkGreen, fontSize: 16, fontWeight: 'bold', marginTop:10, textDecorationLine: 'underline' },
    iosPickerDoneButtonAbsolute: { position: 'absolute', bottom: 80, alignSelf: 'center', backgroundColor: PALETTE.mediumGreen, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, zIndex: 10, elevation: 3 },
    iosPickerDoneText: { color: PALETTE.white, fontWeight: 'bold', fontSize: 15 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.modalBackground, }, modalContent: { width: '85%', backgroundColor: PALETTE.white, borderRadius: 15, padding: 20, alignItems: 'stretch', shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, }, modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: PALETTE.darkGrey, textAlign: 'center' }, modalInput: { borderWidth: 1, borderColor: PALETTE.grey, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, marginBottom: 15, }, modalLabel: { fontSize: SIZES.labelFont, color: PALETTE.darkGrey, marginBottom: 5, fontWeight: '500', }, timeDisplayButton: { borderWidth: 1, borderColor: PALETTE.grey, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15, alignItems: 'center', backgroundColor: PALETTE.white, }, timeDisplayText: { fontSize: 16, color: PALETTE.mediumGreen, fontWeight: 'bold' }, newTimePickerContainer: { marginBottom: 15, alignItems: 'center', width: '100%' }, iosPickerDoneButton: { backgroundColor: PALETTE.mediumGreen, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15, marginTop: 10, alignSelf: 'center' }, modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, }, modalButton: { flex: 1, borderRadius: SIZES.optionButtonBorderRadius, paddingVertical: 12, elevation: 2, marginHorizontal: 5, alignItems: 'center', }, modalCancelButton: { backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.grey, }, modalAddButton: { backgroundColor: PALETTE.addBtnBackground, }, modalCancelButtonText: { color: PALETTE.modalButtonCancelText, fontWeight: 'bold', fontSize: 15, }, modalAddButtonText: { color: PALETTE.modalButtonAddText, fontWeight: 'bold', fontSize: 15, },
});

export default CoachReminders;
