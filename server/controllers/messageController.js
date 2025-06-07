// controllers/messageController.js
const { firebaseInstances } = require('../config/firebase'); // Adjust path if needed
const admin = firebaseInstances.admin; // Needed for FieldValue
const db = firebaseInstances.db;       // Firestore instance
const FieldValue = admin.firestore.FieldValue; // Import FieldValue

// Helper: Check Firebase DB readiness
function checkFirebaseReady(res, action = "perform action") {
    if (!db) {
        console.error(`Firebase DB service not initialized when trying to ${action}.`);
        res.status(500).json({ error: `Server configuration error (${action}).` });
        return false;
    }
    return true;
}

// --- Get list of conversations for the logged-in user ---
exports.getConversations = async (req, res) => {
    if (!checkFirebaseReady(res, "get conversations")) return;
    // Get the UID of the currently logged-in user (could be Personal or Professional)
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "User authentication missing." });
    console.log(`CTRL: getConversations invoked for user/coach: ${userId}`);

    try {
        const chatsRef = db.collection('chats');
        // Query for chats where the user's ID is in the participants array
        // Order by the last message activity, newest first
        // !!! REQUIRES INDEX: collection=chats, fields: participants (Array Contains), lastActivity (Desc) !!!
        const q = chatsRef
            .where('participants', 'array-contains', userId)
            .orderBy('lastActivity', 'desc');

        const querySnapshot = await q.get();
        console.log(`CTRL: getConversations - Query found ${querySnapshot.size} chats for ${userId}.`);

        const conversations = querySnapshot.docs.map(doc => ({
            id: doc.id, // The chatId
            ...doc.data() // Include all data like lastMessage, userDetails, coachDetails, unread counts etc.
        }));

        // Determine which unread count to return based on user type (optional, client can figure it out too)
        // const userType = req.user?.userType; // Assuming middleware adds userType
        // conversations.forEach(conv => {
        //     conv.myUnreadCount = (userType === 'Professional') ? conv.coachUnreadCount : conv.userUnreadCount;
        // });

        res.status(200).json({ conversations: conversations });

    } catch (error) {
        console.error(`CTRL Error: getting conversations for user/coach ${userId}:`, error);
         const isIndexError = error.message?.includes("requires an index") || error.message?.includes("needs an index");
         if (isIndexError) {
             console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
             console.error(`!!! FIRESTORE INDEX MISSING for 'chats' collection !!!`);
             console.error(`!!! Go to Firebase Console -> Firestore -> Indexes -> Composite.`);
             console.error(`!!! Create an index for Collection ID='chats', Fields: participants (Array Contains), lastActivity (Desc). Scope: Collection !!!`);
             console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
             return res.status(500).json({ message: "Database configuration error.", error: "Missing required database index." });
         }
        res.status(500).json({ message: "Server error fetching conversations", error: error.message });
    }
};

// --- Get messages for a specific chat ---
exports.getChatMessages = async (req, res) => {
    if (!checkFirebaseReady(res, "get chat messages")) return;
    const currentUserId = req.user?.uid; // The user/coach making the request
    const { chatId } = req.params; // Get chatId from URL parameter

    if (!currentUserId) return res.status(401).json({ error: "User authentication missing." });
    if (!chatId) return res.status(400).json({ error: "Chat ID parameter is required." });
    console.log(`CTRL: getChatMessages invoked by ${currentUserId} for chat: ${chatId}`);

    try {
        // Security Check: Verify the requesting user is a participant in this chat
        const chatDocRef = db.collection('chats').doc(chatId);
        const chatDocSnap = await chatDocRef.get();

        if (!chatDocSnap.exists) {
            return res.status(404).json({ error: "Chat not found." });
        }
        const chatData = chatDocSnap.data();
        if (!chatData.participants || !chatData.participants.includes(currentUserId)) {
            console.warn(`CTRL: getChatMessages - FORBIDDEN access attempt by ${currentUserId} for chat ${chatId}`);
            return res.status(403).json({ error: "You are not authorized to view this chat." });
        }

        // Fetch messages from the subcollection, ordered by timestamp
        const messagesRef = chatDocRef.collection('messages');
        // !!! REQUIRES INDEX: collection=messages, field: timestamp (Asc), Scope: Collection Group or Collection !!!
        const q = messagesRef.orderBy('timestamp', 'asc'); // Oldest first

        const querySnapshot = await q.get();
        console.log(`CTRL: getChatMessages - Query found ${querySnapshot.size} messages for chat ${chatId}.`);

        const messages = querySnapshot.docs.map(doc => ({
            id: doc.id, // messageId
            ...doc.data()
        }));

        // Optional: Reset the current user's unread count upon fetching messages
        const userType = chatData.coachDetails?.coachId === currentUserId ? 'coach' : 'user'; // Determine if requester is coach or user
        const unreadFieldToReset = userType === 'coach' ? 'coachUnreadCount' : 'userUnreadCount';

        if (chatData[unreadFieldToReset] > 0) {
             await chatDocRef.update({ [unreadFieldToReset]: 0 }); // Use bracket notation for dynamic field name
             console.log(`CTRL: getChatMessages - Reset ${unreadFieldToReset} for chat ${chatId}`);
        }

        res.status(200).json({ messages: messages });

    } catch (error) {
        console.error(`CTRL Error: getting messages for chat ${chatId} by user/coach ${currentUserId}:`, error);
        const isIndexError = error.message?.includes("requires an index") || error.message?.includes("needs an index");
         if (isIndexError) {
             console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
             console.error(`!!! FIRESTORE INDEX MISSING for 'messages' subcollection !!!`);
             console.error(`!!! Go to Firebase Console -> Firestore -> Indexes -> Composite.`);
             console.error(`!!! Create an index for Collection ID='messages', Field: timestamp (Asc). Scope: Collection Group or Collection !!!`);
             console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
             return res.status(500).json({ message: "Database configuration error.", error: "Missing required database index." });
         }
        res.status(500).json({ message: "Server error fetching messages", error: error.message });
    }
};

// --- Send a new message in a specific chat ---
exports.sendChatMessage = async (req, res) => {
    if (!checkFirebaseReady(res, "send chat message")) return;
    const senderId = req.user?.uid; // The user/coach sending the message
    const { chatId } = req.params; // Chat ID from URL
    const { text, receiverId } = req.body; // Message text and recipient's UID from body

    // Validate inputs
    if (!senderId) return res.status(401).json({ error: "User authentication missing." });
    if (!chatId) return res.status(400).json({ error: "Chat ID parameter is required." });
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: "Message text cannot be empty." });
    }
    if (!receiverId) return res.status(400).json({ error: "Receiver ID is required." });
    if (senderId === receiverId) return res.status(400).json({ error: "Cannot send message to yourself." }); // Prevent self-messaging

    console.log(`CTRL: sendChatMessage invoked by ${senderId} in chat: ${chatId} to user: ${receiverId}`);

    try {
        // References
        const chatDocRef = db.collection('chats').doc(chatId);
        const messagesRef = chatDocRef.collection('messages');

        // Security Check: Verify sender is a participant before allowing send
        const chatDocSnap = await chatDocRef.get();
        if (!chatDocSnap.exists) return res.status(404).json({ error: "Chat not found." });
        const chatData = chatDocSnap.data();
        // Ensure BOTH sender and receiver are in the participants list for this chat
        if (!chatData.participants || !chatData.participants.includes(senderId) || !chatData.participants.includes(receiverId)) {
             return res.status(403).json({ error: "Sender or receiver not authorized for this chat." });
        }

        // Prepare message data
        const messageData = {
            senderId: senderId,
            receiverId: receiverId,
            text: text.trim(),
            timestamp: FieldValue.serverTimestamp(), // Use server time
            // read: false // Optional: initialize as unread
        };

        // Add the message document to the subcollection
        const newMessageRef = await messagesRef.add(messageData);
        console.log(`CTRL: sendChatMessage - Message ${newMessageRef.id} added to chat ${chatId}.`);

        // *** IMPORTANT: Update parent chat document using a Transaction or Cloud Function ***
        // Determine which unread count to increment based on who the receiver is
        const receiverIsCoach = chatData.coachDetails?.coachId === receiverId;
        const unreadFieldToIncrement = receiverIsCoach ? 'coachUnreadCount' : 'userUnreadCount';

        await chatDocRef.update({
            lastMessage: { // Update the preview
                text: messageData.text,
                senderId: messageData.senderId,
                timestamp: messageData.timestamp
            },
            lastActivity: messageData.timestamp, // Update sorting field
            [unreadFieldToIncrement]: FieldValue.increment(1) // Increment receiver's unread count
        });
        console.log(`CTRL: sendChatMessage - Updated parent chat ${chatId} metadata. Incremented ${unreadFieldToIncrement}.`);


        res.status(201).json({ message: "Message sent successfully.", messageId: newMessageRef.id });
         // TODO: Implement push notification trigger (ideally via Cloud Function)

    } catch (error) {
        console.error(`CTRL Error: sending message in chat ${chatId} by ${senderId}:`, error);
        res.status(500).json({ message: "Server error sending message", error: error.message });
    }
};

// --- (Optional) Mark Chat as Read ---
exports.markChatAsRead = async (req, res) => {
    if (!checkFirebaseReady(res, "mark chat read")) return;
    const currentUserId = req.user?.uid;
    const { chatId } = req.params;

    if (!currentUserId || !chatId) return res.status(400).json({ error: "User/Chat ID missing." });
    console.log(`CTRL: markChatAsRead invoked by ${currentUserId} for chat: ${chatId}`);

    try {
        const chatDocRef = db.collection('chats').doc(chatId);
        const chatDocSnap = await chatDocRef.get();

        if (!chatDocSnap.exists) return res.status(404).json({ error: "Chat not found." });
        const chatData = chatDocSnap.data();
        if (!chatData.participants || !chatData.participants.includes(currentUserId)) {
            return res.status(403).json({ error: "Not authorized for this chat." });
        }

        // Determine which counter to reset
        const userType = chatData.coachDetails?.coachId === currentUserId ? 'coach' : 'user';
        const unreadFieldToReset = userType === 'coach' ? 'coachUnreadCount' : 'userUnreadCount';

        if (chatData[unreadFieldToReset] > 0) {
            await chatDocRef.update({ [unreadFieldToReset]: 0 });
            console.log(`CTRL: markChatAsRead - Reset ${unreadFieldToReset} for chat ${chatId}`);
            res.status(200).json({ message: "Chat marked as read." });
        } else {
            console.log(`CTRL: markChatAsRead - No unread messages to mark for ${unreadFieldToReset} in chat ${chatId}`);
            res.status(200).json({ message: "No unread messages." }); 
        }

    } catch (error) {
        console.error(`CTRL Error: marking chat ${chatId} read by ${currentUserId}:`, error);
        res.status(500).json({ message: "Server error marking chat as read", error: error.message });
    }
};
exports.findOrCreateChat = async (req, res) => {
    if (!checkFirebaseReady(res, "find/create chat")) return;
    const requesterId = req.user?.uid;
    const { participantIds } = req.body; // Expecting array: [coachId, clientId]

    // Validation
    if (!requesterId) return res.status(401).json({ error: "Authentication missing." });
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length !== 2) {
        return res.status(400).json({ error: "Two participant IDs are required." });
    }
    if (!participantIds.includes(requesterId)) {
        return res.status(403).json({ error: "Requester is not part of the specified chat participants." });
    }

    const sortedParticipantIds = [...participantIds].sort(); // Sort for consistent querying/doc ID
    const otherParticipantId = sortedParticipantIds.find(id => id !== requesterId);

    console.log(`CTRL: findOrCreateChat by ${requesterId} for participants: ${sortedParticipantIds.join(', ')}`);

    try {
        const chatsRef = db.collection('chats');
        // Efficient Query: Use sorted participants array as ID or query directly
        // Option 1: Query based on participants array (requires index)
         const q = chatsRef
             .where('participants', '==', sortedParticipantIds); // Query for exact sorted array match

        // Option 2: Query using array-contains (less efficient, needs filtering)
        // const q = chatsRef.where('participants', 'array-contains', sortedParticipantIds[0]);

        const querySnapshot = await q.get();
        let existingChatId = null;

        // If using Option 2 query, filter results:
         /* if (!querySnapshot.empty) {
            querySnapshot.forEach(doc => {
                 const data = doc.data();
                 if (data.participants && data.participants.length === 2 && data.participants.includes(sortedParticipantIds[1])) {
                     existingChatId = doc.id;
                 }
            });
        }*/
        // If using Option 1 query (exact match):
        if (!querySnapshot.empty) {
             existingChatId = querySnapshot.docs[0].id; // Should only be one match
        }

        if (existingChatId) {
            console.log(`CTRL: findOrCreateChat - Found existing chat: ${existingChatId}`);
            return res.status(200).json({ chatId: existingChatId });
        } else {
            // Create new chat
            console.log(`CTRL: findOrCreateChat - No existing chat found. Creating new chat...`);

            // Determine who is coach and user based on requesterId (assuming requester is coach here)
            const coachId = requesterId;
            const userId = otherParticipantId;

            // Fetch minimal details for participants
            const userDetailsList = await getMultipleUserPublicDetails([userId]);
            const coachDetailsList = await getMultipleNutritionistPublicDetails([coachId]); // Fetch coach details too

             const userData = userDetailsList[userId];
             const coachData = coachDetailsList[coachId];

            const newChatData = {
                participants: sortedParticipantIds,
                lastMessage: null,
                 userDetails: userData ? {
                     userId: userId,
                     userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
                     userPhotoUrl: userData.profileImageUrl || null
                 } : { userId: userId, userName: 'User', userPhotoUrl: null },
                 coachDetails: coachData ? {
                     coachId: coachId,
                     coachName: `${coachData.firstName || ''} ${coachData.lastName || ''}`.trim(),
                     coachPhotoUrl: coachData.profileImageUrl || null
                 } : { coachId: coachId, coachName: 'Coach', coachPhotoUrl: null },
                userUnreadCount: 0,
                coachUnreadCount: 0,
                lastActivity: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp()
            };

            const newChatRef = await chatsRef.add(newChatData);
            console.log(`CTRL: findOrCreateChat - Created new chat with ID: ${newChatRef.id}`);
            return res.status(201).json({ chatId: newChatRef.id }); // Return 201 Created
        }

    } catch (error) {
        console.error(`CTRL Error: finding or creating chat between ${sortedParticipantIds.join(' & ')}:`, error);
        res.status(500).json({ message: "Server error finding or creating chat", error: error.message });
    }
};
// Helper: Get details for MULTIPLE nutritionists
const getMultipleNutritionistPublicDetails = async (nutritionistIds) => {
    if (!db || !nutritionistIds || nutritionistIds.length === 0) {
         console.log("CTRL Helper: getMultipleNutritionistDetails - Skipping, no IDs or DB.");
         return {};
    }
    const uniqueIds = [...new Set(nutritionistIds.filter(id => !!id))];
    if (uniqueIds.length === 0) {
         console.log("CTRL Helper: getMultipleNutritionistDetails - Skipping, no unique valid IDs.");
         return {};
    }
    console.log(`CTRL Helper: getMultipleNutritionistDetails - Fetching details for IDs: ${uniqueIds.join(', ')}`);
    const refs = uniqueIds.map(id => db.collection('nutritionists').doc(id));
    try {
        const docSnaps = await db.getAll(...refs);
        console.log(`CTRL Helper: getMultipleNutritionistDetails - db.getAll() returned ${docSnaps.length} snapshots.`);
        const detailsMap = {};
        docSnaps.forEach(docSnap => {
            if (docSnap.exists) {
                const data = docSnap.data();
                detailsMap[docSnap.id] = {
                    id: docSnap.id,
                    firstName: data.firstName || '', lastName: data.lastName || '', specialization: data.specialization || '',
                    profileImageUrl: data.profileImage || data.profileImageUrl || null, // Use actual field name
                    yearsOfExperience: data.yearsOfExperience || '0', // Keep string
                    workplace: data.workplace || '', shortBio: data.shortBio || '',
                    averageRating: data.averageRating || 0, ratingCount: data.ratingCount || 0,
                    userType: data.userType || 'Professional'
                };
            }
        });
        console.log(`CTRL Helper: getMultipleNutritionistDetails - Mapped ${Object.keys(detailsMap).length} nutritionists.`);
        return detailsMap;
    } catch (error) {
        console.error("CTRL Helper: Error in getMultipleNutritionistPublicDetails:", error);
        return {};
    }
};

// Helper: Get details for MULTIPLE users
const getMultipleUserPublicDetails = async (userIds) => {
     if (!db || !userIds || userIds.length === 0) {
         console.log("CTRL Helper: getMultipleUserDetails - Skipping, no IDs or DB.");
         return {};
     }
     const uniqueIds = [...new Set(userIds.filter(id => !!id))];
     if (uniqueIds.length === 0) {
        console.log("CTRL Helper: getMultipleUserDetails - Skipping, no unique valid IDs.");
        return {};
     }
     console.log(`CTRL Helper: getMultipleUserDetails - Fetching details for User IDs: ${uniqueIds.join(', ')}`);
     const refs = uniqueIds.map(id => db.collection('users').doc(id));
     try {
         const docSnaps = await db.getAll(...refs);
         console.log(`CTRL Helper: getMultipleUserDetails - db.getAll() returned ${docSnaps.length} snapshots.`);
         const detailsMap = {};
         docSnaps.forEach(docSnap => {
             if (docSnap.exists) {
                 const data = docSnap.data();
                 // Define what USER details the COACH should see in the request list
                 detailsMap[docSnap.id] = {
                     id: docSnap.id,
                     firstName: data.firstName || '', // Ensure 'users' collection has these
                     lastName: data.lastName || '',
                     profileImageUrl: data.profileImage || data.profileImageUrl || null, // If users have photos
                     goal: data.goal || data.primaryGoal || 'Goal not specified', // Check field name in 'users'
                     userType: data.userType || 'Personal' // Include userType/role
                     // Add any other relevant fields
                 };
             } else {
                  console.warn(`CTRL Helper: getMultipleUserDetails - User doc not found: ${docSnap.id}`);
             }
         });
         console.log(`CTRL Helper: getMultipleUserDetails - Mapped ${Object.keys(detailsMap).length} users.`);
         return detailsMap;
     } catch (error) {
         console.error("CTRL Helper: Error in getMultipleUserPublicDetails:", error);
         return {};
     }
 };

