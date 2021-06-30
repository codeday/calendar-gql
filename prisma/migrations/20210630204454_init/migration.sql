-- CreateTable
CREATE TABLE `Subscription` (
    `calendarId` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `destinationType` ENUM('Phone', 'Email') NOT NULL,
    `sent` BOOLEAN NOT NULL,

    PRIMARY KEY (`calendarId`, `eventId`, `destination`, `destinationType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
