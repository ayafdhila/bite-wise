const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// BiteWise Brand Colors
const PALETTE = {
    darkGreen: '#2E4A32',
    mediumGreen: '#88A76C',
    lightOrange: '#FCCF94',
    lightCream: '#F5E4C3',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#A0A0A0',
    darkGrey: '#555555',
    acceptGreen: '#4CAF50',
    declineRed: '#F44336',
    errorRed: '#D32F2F',
    adminBlue: '#42A5F5',
    successGreen: '#4CAF50',
};

// ===== SIMPLE & CUTE EMAIL TEMPLATE =====
const createEmailTemplate = (title, content, theme = 'default') => {
    
    const getThemeColors = (theme) => {
        switch(theme) {
            case 'approval':
                return {
                    headerBg: PALETTE.mediumGreen,
                    emoji: '🎉',
                    accentColor: PALETTE.acceptGreen
                };
            case 'rejection':
                return {
                    headerBg: PALETTE.lightOrange,
                    emoji: '💌',
                    accentColor: PALETTE.declineRed
                };
            default:
                return {
                    headerBg: PALETTE.mediumGreen,
                    emoji: '🍽️',
                    accentColor: PALETTE.mediumGreen
                };
        }
    };

    const themeColors = getThemeColors(theme);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: ${PALETTE.lightCream};
                padding: 20px;
                line-height: 1.5;
            }
            
            .email-container { 
                max-width: 400px;
                margin: 0 auto;
                background: ${PALETTE.white};
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 8px 30px rgba(0,0,0,0.1);
            }
            
            .header { 
                background: ${themeColors.headerBg};
                color: ${PALETTE.white};
                padding: 30px 20px;
                text-align: center;
            }
            
            .header .emoji {
                font-size: 50px;
                margin-bottom: 10px;
                display: block;
            }
            
            .header h1 { 
                font-size: 22px;
                font-weight: 600;
                margin-bottom: 5px;
            }
            
            .header p { 
                font-size: 14px;
                opacity: 0.9;
                font-weight: 300;
            }
            
            .content { 
                padding: 30px 25px;
                text-align: center;
            }
            
            .content h2 { 
                color: ${PALETTE.darkGreen};
                font-size: 20px;
                margin-bottom: 15px;
                font-weight: 600;
            }
            
            .content p { 
                color: ${PALETTE.darkGrey};
                font-size: 15px;
                margin-bottom: 15px;
                line-height: 1.6;
            }
            
            .cute-box { 
                background: ${PALETTE.lightCream};
                padding: 20px;
                border-radius: 15px;
                margin: 20px 0;
                border: 2px solid ${themeColors.accentColor};
            }
            
            .cute-box h3 { 
                color: ${themeColors.accentColor};
                font-size: 16px;
                margin-bottom: 10px;
                font-weight: 600;
            }
            
            .cute-box p { 
                color: ${PALETTE.darkGrey};
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .button { 
                display: inline-block;
                background: ${themeColors.accentColor};
                color: ${PALETTE.white};
                padding: 12px 25px;
                border-radius: 25px;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                margin: 15px 0;
                transition: transform 0.2s;
            }
            
            .button:hover { 
                transform: translateY(-2px);
            }
            
            .footer { 
                background: ${PALETTE.darkGreen};
                color: ${PALETTE.white};
                padding: 20px;
                text-align: center;
                font-size: 12px;
            }
            
            .footer p { 
                margin-bottom: 8px;
                opacity: 0.8;
            }
            
            .cute-list {
                text-align: left;
                padding-left: 0;
            }
            
            .cute-list li {
                list-style: none;
                padding: 8px 0;
                color: ${PALETTE.darkGrey};
                font-size: 14px;
                position: relative;
                padding-left: 25px;
            }
            
            .cute-list li:before {
                content: "✨";
                position: absolute;
                left: 0;
                color: ${themeColors.accentColor};
            }
            
            @media (max-width: 480px) {
                .email-container { margin: 10px; }
                .content { padding: 25px 20px; }
                .header { padding: 25px 15px; }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <span class="emoji">${themeColors.emoji}</span>
                <h1>${title}</h1>
                <p>BiteWise</p>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p><strong>BiteWise Team</strong></p>
                <p>Your Smart Guide to Healthy Eating 💚</p>
                <p>© 2025 BiteWise</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Simple email templates
const EMAIL_TEMPLATES = {
    coachRejection: {
        subject: '💌 Your BiteWise Coach Application',
        createBody: (coachName, rejectionReason) => {
            const content = `
                <h2>Hi ${coachName}! 👋</h2>
                <p>Thank you for wanting to join our coaching family!</p>
                
                <div class="cute-box">
                    <h3>📝 Application Update</h3>
                    <p>We've reviewed your application but can't approve it right now.</p>
                    ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
                </div>

                <div class="cute-box">
                    <h3>🔄 Fresh Start!</h3>
                    <p>Your account has been reset so you can create a new one and try again with better credentials!</p>
                </div>

                <p><strong>What to do next:</strong></p>
                <ul class="cute-list">
                    <li>Get the right certifications</li>
                    <li>Create a new account</li>
                    <li>Apply again when ready</li>
                </ul>

                <a href="https://bitewise.app/signup" class="button">Create New Account 🆕</a>
                
                <p>Questions? Email us at bitewisebitewise@gmail.com.com</p>
            `;
            
            return createEmailTemplate('Application Update', content, 'rejection');
        }
    },

    coachApproval: {
        subject: '🎉 Welcome Coach - You\'re Approved!',
        createBody: (coachName) => {
            const content = `
                <h2>Congratulations ${coachName}! 🎊</h2>
                <p>You're now an official BiteWise coach!</p>
                
                <div class="cute-box">
                    <h3>✅ You're All Set!</h3>
                    <p>Your coach verification is complete and you can start helping clients right away!</p>
                </div>

                <p><strong>Your coach perks:</strong></p>
                <ul class="cute-list">
                    <li>Verified coach badge</li>
                    <li>Client management tools</li>
                    <li>Direct messaging</li>
                </ul>

                <a href="https://bitewise.app/coach-dashboard" class="button">Start Coaching 🚀</a>
                
                <p>Ready to change lives? Let's go! 💪</p>
            `;
            
            return createEmailTemplate('Welcome Coach!', content, 'approval');
        }
    },

    coachPending: {
        subject: '⏳ Your Application is Being Reviewed',
        createBody: (coachName) => {
            const content = `
                <h2>Hi ${coachName}! 👋</h2>
                <p>Thanks for applying to be a BiteWise coach!</p>
                
                <div class="cute-box">
                    <h3>🔍 Under Review</h3>
                    <p>Our team is checking your application. This usually takes 3-5 days.</p>
                </div>

                <p><strong>We're reviewing:</strong></p>
                <ul class="cute-list">
                    <li>Your certifications</li>
                    <li>Experience background</li>
                    <li>Application details</li>
                </ul>

                <a href="https://bitewise.app/profile" class="button">Check Your Profile 👤</a>
                
                <p>We'll email you as soon as we're done! 📧</p>
            `;
            
            return createEmailTemplate('Application Review', content, 'default');
        }
    }
};

// Email functions (same as before but simpler logging)
const sendCoachApprovalEmail = async (coachEmail, coachName) => {
    try {
        const template = EMAIL_TEMPLATES.coachApproval;
        const htmlContent = template.createBody(coachName);
        
        const mailOptions = {
            from: `"BiteWise 🍽️" <${process.env.EMAIL_USER}>`,
            to: coachEmail,
            subject: template.subject,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Approval email sent to ${coachEmail}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Approval email failed:', error.message);
        return { success: false, error: error.message };
    }
};

const sendCoachRejectionEmail = async (coachEmail, coachName, rejectionReason) => {
    try {
        const template = EMAIL_TEMPLATES.coachRejection;
        const htmlContent = template.createBody(coachName, rejectionReason);
        
        const mailOptions = {
            from: `"BiteWise 🍽️" <${process.env.EMAIL_USER}>`,
            to: coachEmail,
            subject: template.subject,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`📧 Rejection email sent to ${coachEmail}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Rejection email failed:', error.message);
        return { success: false, error: error.message };
    }
};

const sendCoachPendingEmail = async (coachEmail, coachName) => {
    try {
        const template = EMAIL_TEMPLATES.coachPending;
        const htmlContent = template.createBody(coachName);
        
        const mailOptions = {
            from: `"BiteWise 🍽️" <${process.env.EMAIL_USER}>`,
            to: coachEmail,
            subject: template.subject,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`⏳ Pending email sent to ${coachEmail}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Pending email failed:', error.message);
        return { success: false, error: error.message };
    }
};

const validateEmailAddress = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const sendTestEmail = async (testEmail) => {
    const content = `
        <h2>Test Email 🧪</h2>
        <p>Your email system is working perfectly!</p>
        <div class="cute-box">
            <h3>✅ All Good!</h3>
            <p>BiteWise email template is ready to go!</p>
        </div>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
    `;
    
    const htmlContent = createEmailTemplate('Email Test', content, 'default');
    
    const mailOptions = {
        from: `"BiteWise Test 🍽️" <${process.env.EMAIL_USER}>`,
        to: testEmail,
        subject: '🧪 BiteWise Email Test',
        html: htmlContent
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendCoachApprovalEmail,
    sendCoachRejectionEmail,
    sendCoachPendingEmail,
    sendTestEmail,
    validateEmailAddress,
    EMAIL_TEMPLATES
};