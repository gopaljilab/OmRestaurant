<?php
	$name = $_POST['name'];
	$email = $_POST['email'];
	$date = $_POST['date'];
	$people = $_POST['people'];
	$request = $_POST['request'];
	// Database connection
	$conn = new mysqli('localhost','root','','omRestaurant_db');
	if($conn->connect_error){
		echo "$conn->connect_error";
		die("Connection Failed : ". $conn->connect_error);
	} else {
		$stmt = $conn->prepare("insert into booking(name, email, date, people, request) values(?, ?, ?, ?,?)");
		$stmt->bind_param("sssss", $name, $email, $date, $people, $request);
		$stmt->execute();
		echo '<script>alert("Booking Succesfully We Will notify you later")</script>';
		$stmt->close();
		$conn->close();
	}
?>