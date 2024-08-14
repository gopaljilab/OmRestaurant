<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
    $message = isset($_POST['message']) ? trim($_POST['message']) : '';

    // Validate required fields
    if (empty($name) || empty($email) || empty($subject) || empty($message)) {
        echo '<script>alert("All fields are required. Please fill in all fields.")</script>';
        exit();
    }

    // Database connection
    $conn = new mysqli('localhost', 'root', '', 'omRestaurant_db');
    if ($conn->connect_error) {
        echo "$conn->connect_error";
        die("Connection Failed: " . $conn->connect_error);
    } else {
        $stmt = $conn->prepare("INSERT INTO contact_us(name, email, subject, message) VALUES(?, ?, ?, ?)");
        $stmt->bind_param("ssss", $name, $email, $subject, $message);
        if ($stmt->execute()) {
            echo '<script>alert("We will reach you soon.")</script>';
        } else {
            echo '<script>alert("Failed to submit the form. Please try again.")</script>';
        }
        $stmt->close();
        $conn->close();
    }
} else {
    echo '<script>alert("Form not submitted correctly!")</script>';
}
?>
