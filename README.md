# OmRestaurant

OmRestaurant is a restaurant website built with static HTML, CSS, and JavaScript, served by a Java Spring Boot application. Its reservation, contact, and newsletter forms save submissions to MySQL. GSAP provides smooth scrolling for in-page links and the back-to-top control.

## Features

- Restaurant home, about, service, menu, booking, contact, team, and testimonial pages
- Table reservation form with date, time, party size, and optional special request
- Contact form and newsletter subscription form
- MySQL persistence through Spring JDBC
- GSAP smooth scrolling, with reduced-motion support and a fallback if GSAP is unavailable

Online ordering, customer accounts, order tracking, and an admin dashboard are not implemented.

## Requirements

- JDK 21
- Maven 3.6.3 or newer
- MySQL 8 or a compatible MySQL server

## Database setup

Create the `omrestaurant` database in MySQL. Then either import [`database/omRest_db.sql`](database/omRest_db.sql), which creates the database and tables, or start the app after creating the database; Spring Boot initializes the tables from `src/main/resources/schema.sql`.

By default, the app connects to `localhost:3306` as `root` with an empty password. Configure another database with these environment variables before starting the app:

```sh
export DB_URL='jdbc:mysql://localhost:3306/omrestaurant?serverTimezone=UTC'
export DB_USERNAME='your-user'
export DB_PASSWORD='your-password'
```

The app creates missing tables but does not migrate an older table structure. Back up existing data and migrate older tables to the current schema before upgrading.

## Run locally

From the project root, start the application with:

```sh
mvn spring-boot:run
```

Open <http://localhost:8080/>. Stop the application with `Ctrl+C` in the terminal where it is running.

To build and run an executable JAR instead:

```sh
mvn package
java -jar target/omrestaurant-1.0.0.jar
```

## Form endpoints

The HTML forms submit URL-encoded `POST` requests to these routes. On success or invalid input, the server redirects to the related page with a status message.

| Route | Form fields | Database table |
| --- | --- | --- |
| `POST /bookings` | `name`, `email`, `date`, `people`, `request` | `booking` |
| `POST /contact` | `name`, `email`, `subject`, `message` | `contact_us` |
| `POST /newsletter` | `email` | `newsletter` |

## Project layout

```text
src/main/java/com/omrestaurant/       Spring Boot application and form handlers
src/main/resources/application.properties  Database and server configuration
src/main/resources/schema.sql        Table definitions initialized at startup
src/main/resources/static/           HTML pages, styles, scripts, and images
database/omRest_db.sql                Standalone MySQL database setup
```

The pages load GSAP 3.13.0 and its ScrollToPlugin from cdnjs, so browsers need access to that CDN for animated scrolling. If the scripts are unavailable, links still work with native scrolling.
