// --- START OF FILE userReminders.js ---

import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert,
    Platform, ActivityIndicator, Modal, TextInput, Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Notifications from 'expo-notifications';
import Header from './Header'; // Ajuste le chemin si nécessaire
import TabNavigation from './TabNavigation'; // Ajuste le chemin si nécessaire
import { AuthContext } from './AuthContext'; // Ajuste le chemin si nécessaire
// --- IMPORTS FIREBASE FIRESTORE (Client SDK) ---
// Assure-toi que db est bien exporté depuis firebaseConfig.js
import { getFirestore, doc, collection, getDocs, writeBatch, Timestamp } from "firebase/firestore";
import { firebaseApp } from '../firebaseConfig'; // Importe l'app Firebase initialisée

// Reprise Palette et Tailles
const PALETTE = {
    darkGreen: '#2E4A32', mediumGreen: '#88A76C', lightOrange: '#FCCF94', lightCream: '#F5E4C3',
    white: '#FFFFFF', black: '#000000', grey: '#A0A0A0', darkGrey: '#555555',
    errorRed: '#D32F2F', declineRed: '#F44336', nextButtonBackground: '#2E4A32', nextButtonText: '#FFFFFF',
    buttonBorder: '#E0E0E0', addBtnBackground: '#4CAF50', addBtnText: '#FFFFFF',
    modalBackground: 'rgba(0, 0, 0, 0.6)',
    modalButtonCancelText: '#555555', // Valeur Hex directe
    modalButtonAddText: '#FFFFFF',
};
const SIZES = { labelFont: 15, titleFont: 16, inputFont: 15, paddingHorizontal: 15, cardPadding: 15, cardMarginBottom: 15, optionButtonBorderRadius: 20, rowVerticalPadding: 12, iconSize: 24, inputPaddingVertical: 10, inputPaddingHorizontal: 12, modalTitleFont: 18, modalButtonFont: 15, modalBorderRadius: 15, modalPadding: 20, modalButtonHeight: 44 };

// Fonctions utilitaires
const formatTime = (date) => { if (!date || !(date instanceof Date)) return 'Set Time'; let h = date.getHours().toString().padStart(2, '0'); let m = date.getMinutes().toString().padStart(2, '0'); return `${h}:${m}`; };
// Génère un ID LOCAL unique pour les nouveaux rappels AVANT sauvegarde
const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// Configuration initiale Notifications
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, }), });

// --- Initialisation Firestore Client SDK ---
const db = getFirestore(firebaseApp);

const UserReminders = () => {
    const navigation = useNavigation();
    const authContextValue = useContext(AuthContext);
    const { user } = authContextValue || {}; // Utilise une valeur par défaut

    // États
    const [reminders, setReminders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [currentReminderId, setCurrentReminderId] = useState(null);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [newReminderName, setNewReminderName] = useState('');
    const [newReminderTime, setNewReminderTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
    const [showNewTimePicker, setShowNewTimePicker] = useState(false);

    // Demande Permissions
    useEffect(() => {
        registerForPushNotificationsAsync().then(setPermissionsGranted);
        const nL = Notifications.addNotificationReceivedListener(n=>console.log("N:",n?.request?.content?.data));
        const rL = Notifications.addNotificationResponseReceivedListener(r=>console.log("R:",r?.notification?.request?.content?.data));
        return () => { Notifications.removeNotificationSubscription(nL); Notifications.removeNotificationSubscription(rL); };
    }, []);
    async function registerForPushNotificationsAsync() {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync(); let finalStatus = existingStatus;
            if (existingStatus !== 'granted') { const { status } = await Notifications.requestPermissionsAsync(); finalStatus = status; }
            if (finalStatus !== 'granted') { Alert.alert('Permissions Required', 'Enable notifications in settings to use reminders.'); return false; }
            console.log("Notification permissions granted.");
            if (Platform.OS === 'android') { await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C', }); }
            return true;
        } catch (e) { console.error("Error getting notification permissions:", e); Alert.alert("Permission Error", "Could not configure notifications."); return false; }
    }

    // --- Charger depuis Firestore ---
    const loadSettings = useCallback(async () => {
        if (!user?.uid) { setReminders([]); setIsLoading(false); return; }
        console.log(`[Reminders] Loading settings for ${user.uid}...`); setIsLoading(true); setSaveError('');
        try {
            const remindersColRef = collection(db, 'users', user.uid, 'reminders');
            const snapshot = await getDocs(remindersColRef);
            let loadedReminders = [];
            if (!snapshot.empty) {
                loadedReminders = snapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    return { id: docSnap.id, name: data.name || 'Unnamed', enabled: data.enabled ?? false, time: data.time?.toDate ? data.time.toDate() : null };
                });
                 loadedReminders.sort((a, b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0));
            } else { console.log("[Reminders] No saved reminders found."); loadedReminders = []; }
            setReminders(loadedReminders);
        } catch (error) { console.error("[Reminders] Load Error:", error); setSaveError(`Load failed: ${error.message}`); setReminders([]); }
        finally { setIsLoading(false); }
    }, [user?.uid]);

    useEffect(() => { loadSettings(); }, [loadSettings]);
    // --- FIN CHARGEMENT ---

    // Fonctions Notifications
    async function scheduleReminderNotification(reminder) { if (!permissionsGranted || !reminder.enabled || !reminder.time || !(reminder.time instanceof Date) || isNaN(reminder.time)) return null; const h = reminder.time.getHours(); const m = reminder.time.getMinutes(); console.log(`Scheduling: ${reminder.name} (${reminder.id}) @ ${formatTime(reminder.time)}`); try { return await Notifications.scheduleNotificationAsync({ identifier: reminder.id, content: { title:"Reminder 🍜", body:`Time for ${reminder.name}!`, sound:'default', data:{id:reminder.id} }, trigger:{ hour:h, minute:m, repeats:true } }); } catch (e) { console.error(`Schedule Fail ${reminder.name}:`, e); return null; } }
    async function cancelSpecificNotification(id) { if (!id || id.startsWith('local_')) return; console.log(`Cancelling: ${id}`); try { await Notifications.cancelScheduledNotificationAsync(id); console.log(`Cancelled ${id}`); } catch (e) { console.error(`Cancel fail ${id}:`, e); } }
    async function cancelAllScheduledNotifications() { console.log("Cancelling ALL..."); try { await Notifications.cancelAllScheduledNotificationsAsync(); console.log("All Cancelled."); } catch (e) { console.error("Cancel ALL fail:", e); } }

    // Fonctions UI
    const onTimeChange = (e, d) => { const ios = Platform.OS === 'ios'; if (!ios) setShowTimePicker(false); if (d && e.type !== 'dismissed') { const t=new Date(); t.setHours(d.getHours()); t.setMinutes(d.getMinutes()); t.setSeconds(0,0); setReminders(p => p.map(r => r.id === currentReminderId ? { ...r, time: t } : r)); } if (!ios || !d) { setShowTimePicker(false); setCurrentReminderId(null); } if (!showTimePicker || !ios) { setCurrentReminderId(null); } };
    const handleExistingIosPickerDone = () => { setShowTimePicker(false); setCurrentReminderId(null); };
    const showTimePickerFor = (id) => { setCurrentReminderId(id); setShowTimePicker(true); };
    const toggleSwitch = (id) => { setReminders(p => p.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)); };
    const handleAddReminder = () => { setNewReminderName(''); setNewReminderTime(new Date(new Date().setHours(9,0,0,0))); setIsAddModalVisible(true); setShowNewTimePicker(false); };
    const onNewTimeChange = (e, d) => { const ios = Platform.OS === 'ios'; if (!ios) setShowNewTimePicker(false); if (d && e.type !== 'dismissed') { const t=new Date(); t.setHours(d.getHours()); t.setMinutes(d.getMinutes()); t.setSeconds(0,0); setNewReminderTime(t); } };
    const handleNewIosPickerDone = () => setShowNewTimePicker(false);
    const confirmAddReminder = () => { const n=newReminderName.trim(); if(!n||!newReminderTime){Alert.alert("Info Required");return;} const nr={id:generateLocalId(),name:n,time:newReminderTime,enabled:true}; setReminders(p=>[...p,nr]); setIsAddModalVisible(false); setShowNewTimePicker(false); };
    const handleDeleteReminder = (idToDelete) => { const r=reminders.find(rem => rem.id === idToDelete); if(!r) return; Alert.alert( "Delete", `Delete "${r.name}"?`, [{text:"Cancel"},{text:"Delete",style:"destructive",onPress:async()=>{setReminders(p=>p.filter(rem=>rem.id!==idToDelete)); await cancelSpecificNotification(idToDelete);}}]); };

    // --- Sauvegarde DANS FIRESTORE et Programme les notifications ---
    const handleSaveChanges = async () => {
        if (!user?.uid) { Alert.alert("Error", "Cannot save without user."); return; }
        if (!permissionsGranted) { Alert.alert("Permissions Needed", "Enable notifications."); return; }

        setIsSaving(true); setSaveError(''); console.log("[Save] Saving & Scheduling reminders:", reminders);

        try {
            // 1. Annuler anciennes notifications
            await cancelAllScheduledNotifications();

            // 2. SAUVEGARDER DANS FIRESTORE
            console.log(`[Firestore Save] Preparing batch for ${user.uid}...`);
            const remindersColRef = collection(db, 'users', user.uid, 'reminders');
            const batch = writeBatch(db); // Crée un batch d'écriture

            // 2a. Supprimer anciens documents Firestore
            const oldSnapshot = await getDocs(remindersColRef);
            oldSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
            console.log(`[Firestore Save] Marked ${oldSnapshot.size} old docs for deletion.`);

            // 2b. Ajouter/Mettre à jour les documents actuels
            let remindersWithFirestoreIds = []; // Pour màj état local et notifications
            reminders.forEach((reminder) => {
                const docRef = reminder.id && !reminder.id.startsWith('local_')
                               ? doc(remindersColRef, reminder.id)
                               : doc(remindersColRef); // Laisse Firestore générer l'ID si local
                batch.set(docRef, { // Utilise set pour créer ou écraser
                    name: reminder.name,
                    enabled: reminder.enabled,
                    time: reminder.time instanceof Date && !isNaN(reminder.time) ? Timestamp.fromDate(reminder.time) : null // Convertit Date JS -> Timestamp Firestore
                });
                remindersWithFirestoreIds.push({ ...reminder, id: docRef.id }); // Garde le nouvel ID
            });
            console.log(`[Firestore Save] Marked ${reminders.length} docs for set/update.`);

            // 3. Exécuter le batch Firestore
            await batch.commit();
            console.log("[Firestore Save] Batch commit successful.");
            // --- FIN SAUVEGARDE FIRESTORE ---

            // 4. Mettre à jour l'état local avec les vrais ID Firestore
            setReminders(remindersWithFirestoreIds);

            // 5. Reprogrammer les notifications
            console.log("[Save] Rescheduling notifications..."); let scheduledCount = 0;
            for (const reminder of remindersWithFirestoreIds) { // Utilise la liste mise à jour
                if (reminder.enabled) { if (await scheduleReminderNotification(reminder)) scheduledCount++; }
            }
            console.log(`[Save] Scheduled ${scheduledCount} notifications.`);
            Alert.alert("Settings Saved", "Reminders updated and scheduled.");

        } catch (error) {
            console.error("[Save] Error saving/scheduling:", error);
            setSaveError(`Could not save/schedule: ${error.message}`);
            Alert.alert("Error", `Could not save/schedule: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

     // Rendu Chargement/Erreur/Login
     if (isLoading) { return <View style={styles.centered}><ActivityIndicator size="large" color={PALETTE.darkGreen} /></View>; }
     if (!user && !isLoading) { return <View style={styles.centered}><Text>Please log in.</Text></View>; }

    // --- Rendu Principal ---
    return (
        <View style={styles.mainContainer}>
            <Header subtitle="Reminders" />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    {reminders.map((reminder) => (
                       <View key={reminder.id} style={styles.reminderRow}>
                            <View style={styles.reminderInfo}>
                                <Text style={styles.reminderName}>{reminder.name}</Text>
                                <TouchableOpacity onPress={() => showTimePickerFor(reminder.id)} disabled={isSaving}><Text style={styles.reminderTime}>{formatTime(reminder.time)}</Text></TouchableOpacity>
                            </View>
                            <View style={styles.actionsContainer}>
                                <Switch trackColor={{ false: PALETTE.grey, true: PALETTE.mediumGreen }} thumbColor={reminder.enabled ? PALETTE.darkGreen : PALETTE.lightCream} onValueChange={() => toggleSwitch(reminder.id)} value={reminder.enabled} disabled={isSaving} style={styles.switchStyle}/>
                                <TouchableOpacity onPress={() => handleDeleteReminder(reminder.id)} disabled={isSaving}><Icon name="trash-bin-outline" size={SIZES.iconSize} color={PALETTE.declineRed} /></TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    {reminders.length === 0 && <Text style={styles.noRemindersText}>No reminders set yet.</Text> }

                    <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAddReminder} disabled={isSaving || !permissionsGranted} >
                        <Text style={styles.addButtonText}>+ Add Reminder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.saveButton, (isSaving || reminders.length === 0) && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={isSaving || reminders.length === 0 || !permissionsGranted} >
                        {isSaving ? <ActivityIndicator color={PALETTE.white} /> : <Text style={styles.buttonText}>Save Changes</Text>}
                    </TouchableOpacity>

                    {!permissionsGranted && <Text style={styles.warningText}>Enable notifications to use reminders.</Text> }
                    {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
                </View>

                {/* Picker pour MODIFIER rappel existant */}
                {showTimePicker && currentReminderId && ( <DateTimePicker testID="dtpExisting" value={reminders.find(r=>r.id===currentReminderId)?.time||new Date()} mode="time" is24Hour={true} display={Platform.OS==='ios'?'spinner':'default'} onChange={onTimeChange} /> )}
                {Platform.OS === 'ios' && showTimePicker && ( <TouchableOpacity style={styles.iosPickerDoneButtonAbsolute} onPress={handleExistingIosPickerDone}><Text style={styles.iosPickerDoneText}>Done</Text></TouchableOpacity> )}
            </ScrollView>
            <TabNavigation />

            {/* Modal d'Ajout */}
            <Modal animationType="fade" transparent={true} visible={isAddModalVisible} onRequestClose={() => setIsAddModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsAddModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={() => {}}>
                        <Text style={styles.modalTitle}>Add New Reminder</Text>
                        <TextInput style={styles.modalInput} placeholder="Reminder Name (e.g., Snack)" placeholderTextColor={PALETTE.grey} value={newReminderName} onChangeText={setNewReminderName} />
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
    mainContainer: { flex: 1, backgroundColor: PALETTE.lightCream, }, 
    scrollContent: { paddingHorizontal: SIZES.paddingHorizontal, paddingVertical: 20, paddingBottom: 40, }, 
    card: { backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: SIZES.cardPadding, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, }, 
    reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SIZES.rowVerticalPadding, borderBottomWidth: 1, borderBottomColor: PALETTE.lightCream, minHeight: 60 }, 
    reminderInfo: { flex: 1, marginRight: 10, justifyContent: 'center' }, 
    reminderName: { fontSize: SIZES.labelFont, color: PALETTE.black, marginBottom: 3, fontFamily: 'QuickSand_700Bold' }, 
    reminderTime: { fontSize: SIZES.labelFont - 1, color: PALETTE.darkGreen, fontFamily: 'QuickSand_700Bold', }, 
    actionsContainer: { flexDirection: 'row', alignItems: 'center', }, switchStyle: { marginHorizontal: 10, transform: Platform.OS === 'ios' ? [] : [{ scaleX: 1.2 }, { scaleY: 1.2 }] }, 
    noRemindersText: { textAlign: 'center', color: PALETTE.darkGrey, marginVertical: 20, fontSize: SIZES.labelFont }, 
    button: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: SIZES.optionButtonBorderRadius, alignItems: 'center', alignSelf: 'center', marginTop: 20, elevation: 2, shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, minWidth: '60%', }, 
    addButton: { backgroundColor: PALETTE.mediumGreen, marginTop: 30, width: '80%', }, 
    addButtonText: { color: PALETTE.addBtnText, fontSize: 16, fontFamily: 'QuickSand_700Bold' }, 
    saveButton: { backgroundColor: PALETTE.darkGreen, width: '80%', }, 
    buttonDisabled: { backgroundColor: PALETTE.grey, }, 
    buttonText: { color: PALETTE.nextButtonText, fontSize: 16, fontFamily: 'QuickSand_700Bold', }, 
    errorText: { color: PALETTE.errorRed, textAlign: 'center', marginTop: 15, fontSize: 14, fontFamily: 'QuickSand_500Medium' }, 
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.lightCream }, 
    warningText: { color: PALETTE.darkGrey, textAlign: 'center', marginTop: 10, fontSize: 13, fontStyle: 'italic' },
    iosPickerDoneButtonAbsolute: { position: 'absolute', bottom: 80, alignSelf: 'center', backgroundColor: PALETTE.mediumGreen, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, zIndex: 10, elevation: 3 },
    iosPickerDoneText: { color: PALETTE.white, fontFamily: 'QuickSand_700Bold', fontSize: 15 },
    // Styles Modal
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PALETTE.modalBackground, }, 
    modalContent: { width: '85%', backgroundColor: PALETTE.lightOrange, borderRadius: 15, padding: 20, alignItems: 'stretch', shadowColor: PALETTE.black, shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, }, 
    modalTitle: { fontSize: 18, fontFamily: 'QuickSand_700Bold', marginBottom: 15, color: PALETTE.black, textAlign: 'center' }, 
    modalInput: { borderWidth: 1, borderColor: PALETTE.grey, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, marginBottom: 15,backgroundColor: PALETTE.lightCream, }, 
    modalLabel: { fontSize: SIZES.labelFont, color: PALETTE.black, marginBottom: 5, fontFamily: 'QuickSand_500Medium', }, 
    timeDisplayButton: { borderWidth: 1, borderColor: PALETTE.grey, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15, alignItems: 'center', backgroundColor: PALETTE.lightCream, }, 
    timeDisplayText: { fontSize: 16, color: PALETTE.mediumGreen, fontFamily: 'QuickSand_700Bold' }, newTimePickerContainer: { marginBottom: 15, alignItems: 'center', width: '100%' }, 
    iosPickerDoneButton: { backgroundColor: PALETTE.mediumGreen, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15, marginTop: 10, alignSelf: 'center' }, 
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, }, 
    modalButton: { flex: 1, borderRadius: SIZES.optionButtonBorderRadius, paddingVertical: 12, elevation: 2, marginHorizontal: 5, alignItems: 'center', }, 
    modalCancelButton: { backgroundColor: PALETTE.mediumGreen, borderWidth: 1, borderColor: PALETTE.grey, }, 
    modalAddButton: { backgroundColor: PALETTE.darkGreen, }, 
    modalCancelButtonText: { color: PALETTE.black, fontFamily: 'QuickSand_700Bold', fontSize: 15, }, 
    modalAddButtonText: { color: PALETTE.white, fontFamily: 'QuickSand_700Bold', fontSize: 15, },
});

export default UserReminders;
// --- END OF FILE userReminders.js ---