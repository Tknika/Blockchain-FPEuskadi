import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate

def send_email(sender_email, sender_password, recipient_email, subject, body):
    # Create message container
    message = MIMEMultipart()
    message['From'] = sender_email
    message['To'] = recipient_email
    message['Subject'] = subject
    message['Date'] = formatdate(localtime=True)

    # Add body to email
    message.attach(MIMEText(body, 'plain'))

    try:
        # Create SMTP_SSL session (implicit TLS on port 465)
        server = smtplib.SMTP_SSL('mail.blockchain.tkn.eus', 465)
        
        # Login to the server
        server.login(sender_email, sender_password)
        
        # Send email
        text = message.as_string()
        server.sendmail(sender_email, recipient_email, text)
        print("Email sent successfully!")
        
        # Close the server connection
        server.quit()
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")

if __name__ == "__main__":
    # Example usage
    sender = "admin@blockchain.tkn.eus"
    password = "********"
    recipient = "recipient@domain.com"
    subject = "Email Python"
    body = "This is a test email sent from Python."
    
    send_email(sender, password, recipient, subject, body)
