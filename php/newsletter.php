<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';


    // Validate required fields
    if (empty($email)) {
        echo '<script>alert("fields are required. Please fill in all fields.")</script>';
        exit();
    }

    // Database connection
    $conn = new mysqli('localhost', 'root', '', 'omRestaurant_db');
    if ($conn->connect_error) {
        echo "$conn->connect_error";
        die("Connection Failed: " . $conn->connect_error);
    } else {
        $stmt = $conn->prepare("INSERT INTO newsletter(email) VALUES(?)");
        $stmt->bind_param("s", $email);
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
