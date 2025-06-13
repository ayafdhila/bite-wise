const cron = require('node-cron');
const {
    initializeNotificationService,
    sendDailyMotivationalNotifications
} = require('./notificationService');

class NotificationScheduler {
    constructor() {
        this.jobs = new Map();
        this.isInitialized = false;
    }

    initialize() {
        const serviceInitialized = initializeNotificationService();
        if (!serviceInitialized) {
            console.error('[NotificationScheduler] Failed to initialize notification service');
            return false;
        }
        
        this.isInitialized = true;
        console.log('[NotificationScheduler] Initialized successfully');
        return true;
    }

    // Démarrer les notifications programmées (2 fois par jour)
    startScheduledNotifications() {
        if (!this.isInitialized) {
            console.error('❌ Scheduler not initialized');
            return false;
        }

        try {
            // ✅ ONLY USER MOTIVATIONS - Morning and Evening
            const morningTask = cron.schedule('0 8 * * *', async () => {
                console.log('🌅 Sending morning motivational notifications...');
                await sendDailyMotivationalNotifications();
            }, {
                scheduled: false,
                timezone: "Africa/Tunis"
            });

            const eveningTask = cron.schedule('0 19 * * *', async () => {
                console.log('🌆 Sending evening motivational notifications...');
                await sendDailyMotivationalNotifications();
            }, {
                scheduled: false,
                timezone: "Africa/Tunis"
            });

            morningTask.start();
            eveningTask.start();

            this.jobs.set('morningMotivation', morningTask);
            this.jobs.set('eveningMotivation', eveningTask);

            console.log('✅ Notification scheduler started successfully');
            console.log('🌅 Morning notifications: 8:00 AM Tunisia time');
            console.log('🌆 Evening notifications: 7:00 PM Tunisia time');
            console.log('📱 Only user motivational notifications will be sent');

            return true;
        } catch (error) {
            console.error('❌ Failed to start scheduled notifications:', error);
            return false;
        }
    }

    // Arrêter le planificateur
    stopScheduler() {
        this.jobs.forEach((job, name) => {
            job.destroy();
            console.log(`⏹️ Stopped job: ${name}`);
        });
        this.jobs.clear();
        console.log('🛑 Notification scheduler stopped');
    }

    // Obtenir le statut
    getStatus() {
        const status = {};
        this.jobs.forEach((job, name) => {
            status[name] = {
                running: job.running || false,
                scheduled: job.scheduled || false
            };
        });
        return {
            initialized: this.isInitialized,
            jobs: status,
            totalJobs: this.jobs.size
        };
    }

    // Envoyer des notifications de test manuellement
    async sendTestNotifications() {
        if (!this.isInitialized) {
            console.error('[NotificationScheduler] Not initialized for test notifications');
            return false;
        }

        try {
            console.log('🧪 Sending test notifications...');
            await Promise.all([
                sendDailyMotivationalNotifications()
            ]);
            console.log('✅ Test notifications sent successfully');
            return true;
        } catch (error) {
            console.error('❌ Error sending test notifications:', error);
            return false;
        }
    }
}

module.exports = new NotificationScheduler();