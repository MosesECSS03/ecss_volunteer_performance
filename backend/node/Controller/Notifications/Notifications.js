var DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class

class NotificationsController
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    } 

    async addNewNotification(notification) {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Performance-Night-2025";
                var collectionName = "notifications";
                var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, notification);
                console.log("Connected Database:", connectedDatabase);
                
                if (connectedDatabase.acknowledged === true) {
                    return {
                        success: true,
                        message: "New notification created successfully",
                        data: result
                    };
                }
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error adding sales records",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }


    async getNotifications() {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Performance-Night-2025";
                var collectionName = "notifications";
                var connectedDatabase = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);
                console.log("Connected Database123:", connectedDatabase);
                
                if (connectedDatabase) {
                    return {
                        success: true,
                        message: "Notifications retrieved successfully",
                        data: connectedDatabase
                    };
                }
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving notifications",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }
}

module.exports = NotificationsController;
