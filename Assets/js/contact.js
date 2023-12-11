const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000; // You can use any port you prefer

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html'); // Make sure to place your HTML file in the same directory as this script
});

// Handle form submission
app.post('/submit', (req, res) => {
  const { fullName, email, phone, message } = req.body;

  // Create a transporter using SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com', // Your Gmail email address
      pass: 'your-password' // Your Gmail password or an app-specific password
    }
  });

  const mailOptions = {
    from: 'your-email@gmail.com', // Your Gmail email address
    to: 'support@videoChat',
    subject: `Contact Request - ${fullName}`,
    text: `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('Email sent:', info.response);
    res.send('Form submitted successfully!');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Mail server is running on http://localhost:${port}`);
});

function openNav() {
  document.getElementById("mySidenav").style.width = "100%";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}
