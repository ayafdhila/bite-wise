const admin = require('firebase-admin');
const cron = require('node-cron');

const db = admin.firestore();

class NotificationScheduler {
    constructor() {
        this.scheduledJobs = new Map();
        console.log('🔄 NotificationScheduler constructor called');
        // Initialize immediately when class is instantiated
        this.initializeScheduledNotifications();
    }

    async initializeScheduledNotifications() {
        try {
            console.log('📅 Initializing notification scheduler...');
            
            // Schedule daily motivational notifications
            this.scheduleMotivationalNotifications();
            
            // Schedule meal reminders
            this.scheduleMealReminders();
            
            // Schedule hydration reminders
            this.scheduleHydrationReminders();
            
            console.log('✅ Notification scheduler initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing notification scheduler:', error);
        }
    }

    scheduleMotivationalNotifications() {
        // Morning motivation at 8:00 AM
        const morningJob = cron.schedule('0 8 * * *', async () => {
            console.log('🌅 Sending morning motivation notifications...');
            await this.sendNotificationToAllUsers({
                type: 'morning_motivation',
                title: '🌅 Good Morning!',
                body: 'Start your day right! Remember to log your breakfast and stay hydrated.'
            });
        }, { 
            scheduled: true, 
            timezone: 'UTC',
            name: 'morning_motivation'
        });

        // Lunch reminder at 12:30 PM
        const lunchJob = cron.schedule('30 12 * * *', async () => {
            console.log('🥗 Sending lunch reminder notifications...');
            await this.sendNotificationToAllUsers({
                type: 'lunch_reminder',
                title: '🥗 Lunch Time Reminder',
                body: "Don't forget to log your lunch! Make healthy choices count."
            });
        }, { 
            scheduled: true, 
            timezone: 'UTC',
            name: 'lunch_reminder'
        });

        // Afternoon boost at 3:30 PM
        const afternoonJob = cron.schedule('30 15 * * *', async () => {
            console.log('💪 Sending afternoon boost notifications...');
            await this.sendNotificationToAllUsers({
                type: 'afternoon_boost',
                title: '💪 Afternoon Boost',
                body: "You're doing great! Remember to log any snacks you have."
            });
        }, { 
            scheduled: true, 
            timezone: 'UTC',
            name: 'afternoon_boost'
        });

        // Hydration check at 4:00 PM
        const hydrationJob = cron.schedule('0 16 * * *', async () => {
            console.log('💧 Sending hydration check notifications...');
            await this.sendNotificationToAllUsers({
                type: 'hydration_check',
                title: '💧 Hydration Check',
                body: 'Time to drink some water! Stay hydrated throughout the day.'
            });
        }, { 
            scheduled: true, 
            timezone: 'UTC',
            name: 'hydration_check'
        });

        this.scheduledJobs.set('morning_motivation', morningJob);
        this.scheduledJobs.set('lunch_reminder', lunchJob);
        this.scheduledJobs.set('afternoon_boost', afternoonJob);
        this.scheduledJobs.set('hydration_check', hydrationJob);

        console.log('📅 Motivational notifications scheduled (4 jobs)');
    }

    scheduleMealReminders() {
        // Breakfast reminder at 7:30 AM
        const breakfastJob = cron.schedule('30 7 * * *', async () => {
            console.log('🍳 Sending breakfast reminder notifications...');
            await this.sendNotificationToAllUsers({
                type: 'meal_reminder',
                title: '🍳 Breakfast Time!',
                body: "Don't skip the most important meal of the day!"
            });
        }, { 
            scheduled: true, 
            timezone: 'UTC',
            name: 'breakfast_reminder'
        });

        // Dinner reminder at 7:00 PM
        const dinnerJob = cron.schedule('0 19 * * *', async () => {
            console.log('🍽️ Sending dinner reminder notifications...');
            await this.sendNotificationToAllUsers({
                type: 'meal_reminder',
                title: '🍽️ Dinner Time',
                body: 'Time for dinner! Don\'t forget to log your evening meal.'
            });
        }, { 
            scheduled: true, 
            timezone: 'UTC',
            name: 'dinner_reminder'
        });

        this.scheduledJobs.set('breakfast_reminder', breakfastJob);
        this.scheduledJobs.set('dinner_reminder', dinnerJob);

        console.log('🍽️ Meal reminders scheduled (2 jobs)');
    }

    scheduleHydrationReminders() {
        // Hydration reminder at 4:00 PM
        const hydrationJob = cron.schedule('0 16 * * *', async () => {
            console.log('💧 Sending hydration reminder notifications...');
            await this.sendNotificationToAllUsers({
                type: 'hydration',
                title: '💧 Stay Hydrated',
                body: 'Remember to drink water throughout the day!'
            });
        }, { 
            scheduled: true, 
            timezone: 'UTC',
            name: 'hydration_reminder'
        });

        this.scheduledJobs.set('hydration_reminder', hydrationJob);
        console.log('💧 Hydration reminders scheduled (1 job)');
    }

    async sendNotificationToAllUsers(notificationData) {
        try {
            console.log(`📢 Sending ${notificationData.type} notifications to all users...`);
            
            // Get all users
            const usersSnapshot = await db.collection('users').get();
            
            if (usersSnapshot.empty) {
                console.log('⚠️ No users found in database');
                return;
            }

            const batch = db.batch();
            let notificationCount = 0;

            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const userData = userDoc.data();

                // Skip if user has disabled notifications
                if (userData.notificationsDisabled === true) {
                    continue;
                }

                const notificationRef = db.collection('users')
                    .doc(userId)
                    .collection('notifications')
                    .doc();

                const notification = {
                    id: notificationRef.id,
                    title: notificationData.title,
                    body: notificationData.body,
                    type: notificationData.type,
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    scheduledType: 'server-generated'
                };

                batch.set(notificationRef, notification);
                notificationCount++;

                // Batch write in chunks of 500
                if (notificationCount % 500 === 0) {
                    await batch.commit();
                    console.log(`📝 Committed batch of ${notificationCount} notifications`);
                }
            }

            // Commit remaining notifications
            if (notificationCount % 500 !== 0) {
                await batch.commit();
            }

            console.log(`✅ Successfully sent ${notificationCount} ${notificationData.type} notifications`);
        } catch (error) {
            console.error(`❌ Error sending ${notificationData.type} notifications:`, error);
        }
    }

    getScheduledJobsInfo() {
        console.log(`📊 Currently scheduled jobs: ${this.scheduledJobs.size}`);
        for (const [name, job] of this.scheduledJobs) {
            console.log(`  - ${name}: ${job.getStatus()}`);
        }
    }

    stopAllJobs() {
        this.scheduledJobs.forEach((job, name) => {
            job.destroy();
            console.log(`⏹️ Stopped job: ${name}`);
        });
        this.scheduledJobs.clear();
        console.log('🛑 All notification jobs stopped');
    }
}

// Export a singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler;