# 🍽️ OmRestaurant

**OmRestaurant** is a dynamic food ordering web application designed to provide customers with an easy and efficient way to explore dishes, place online orders, and have food delivered to their doorstep.  
It also offers admin management, secure user authentication, and convenient contact and subscription features.

---

## 🧭 Overview

OmRestaurant streamlines the online food ordering process for both customers and administrators.  
Customers can browse menus, register accounts, and track their orders, while administrators can manage dishes, users, and incoming orders through an intuitive dashboard.

---

## 🌟 Core Features

- **Menu Browsing:** Explore dishes with images, prices, and descriptions.  
- **Online Ordering:** Place and track food orders online.  
- **User Authentication:** Register, log in, and manage personal orders securely.  
- **Contact Form:** Send feedback or inquiries directly to the restaurant team.  
- **Newsletter Subscription:** Stay updated with new dishes and offers.  
- **Admin Dashboard:** Manage users, dishes, and orders with ease.

---

## ⚙️ Getting Started

### Prerequisites
Before running the project, make sure you have:
- **XAMPP** or any PHP-supported local server  
- **Composer** (optional, for PHPMailer)  
- **MySQL** for database management  

### Installation Steps
1. **Clone this repository**
   ```bash
   git clone https://github.com/yourusername/OmRestaurant.git
   ```

2. **Move the folder**
   Place the project inside your local server directory (e.g., `htdocs` in XAMPP).

3. **Start the server**
   Open XAMPP and start **Apache** and **MySQL**.

4. **Install dependencies (optional)**
   ```bash
   composer install
   ```

---

## 💻 Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Bootstrap  
- **Backend:** PHP  
- **Database:** MySQL  
- **Server:** Apache  
- **Mail Service:** PHPMailer (optional)

---

## 🧩 Environment Setup

Edit your `config.php` file to include your database credentials:
```php
$host = 'localhost';
$username = 'root';
$password = '';
$database = 'omrestaurant';
```

If using PHPMailer, update SMTP details in your mail configuration file.

---

## 🗃️ Database Configuration

1. Open [phpMyAdmin](http://localhost/phpmyadmin).  
2. Create a new database:
   ```
   omrestaurant
   ```
3. Import the SQL file:
   ```
   omrestaurant.sql
   ```
4. Confirm tables for users, orders, dishes, and subscriptions exist.

---

## ▶️ Running the App

Open your browser and visit:
```
http://localhost/OmRestaurant/
```

From there:
- **Users** can browse dishes, sign up, and order food.  
- **Admins** can manage everything from the admin panel.

---

## 🧠 Common Issues

| Issue | Possible Fix |
|-------|---------------|
| Database connection failed | Verify database credentials in `config.php` |
| PHPMailer error | Recheck SMTP configuration or enable less secure app access |
| CSS/JS not loading | Confirm correct file paths and project folder placement |

---

## 👨‍💻 Developer Guide

- Fork this repo to create your own version.  
- Use the `/admin` directory for admin-related logic and panels.  
- Keep separate configuration files for security and maintainability.  
- Follow consistent naming conventions for scalability.

---

## 📜 License & Credits

This project is licensed under the **MIT License**.  
Feel free to use, modify, and distribute this project with proper attribution.

---
