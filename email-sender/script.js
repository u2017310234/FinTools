document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('emailForm');
    const sendButton = document.getElementById('sendButton');
    const statusDiv = document.getElementById('status');

    // Email validation function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show status message
    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    }

    // Simulate sending email (with artificial delay)
    async function simulateSendEmail(emailData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate random success/failure
                const success = Math.random() > 0.1; // 90% success rate
                if (success) {
                    resolve();
                } else {
                    reject(new Error('Failed to send email'));
                }
            }, 1000); // 1 second delay
        });
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form values
        const subject = document.getElementById('subject').value.trim();
        const content = document.getElementById('content').value.trim();
        const recipientsText = document.getElementById('recipients').value.trim();
        
        // Split recipients by newline and filter empty lines
        const recipients = recipientsText
            .split('\n')
            .map(email => email.trim())
            .filter(email => email.length > 0);

        // Validate inputs
        if (!subject) {
            showStatus('Please enter a subject', true);
            return;
        }

        if (!content) {
            showStatus('Please enter email content', true);
            return;
        }

        if (recipients.length === 0) {
            showStatus('Please enter at least one recipient', true);
            return;
        }

        // Validate email addresses
        const invalidEmails = recipients.filter(email => !isValidEmail(email));
        if (invalidEmails.length > 0) {
            showStatus(`Invalid email addresses found: ${invalidEmails.join(', ')}`, true);
            return;
        }

        // Disable form while sending
        sendButton.disabled = true;
        showStatus(`Sending emails to ${recipients.length} recipients...`);

        try {
            // Process each recipient
            const results = await Promise.allSettled(
                recipients.map(recipient =>
                    simulateSendEmail({
                        to: recipient,
                        subject,
                        content
                    })
                )
            );

            // Count successes and failures
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            // Show final status
            showStatus(
                `Sent ${successful} emails successfully. ${failed ? `Failed to send ${failed} emails.` : ''}`,
                failed > 0
            );
        } catch (error) {
            showStatus('An error occurred while sending emails', true);
        } finally {
            sendButton.disabled = false;
        }
    });
});
