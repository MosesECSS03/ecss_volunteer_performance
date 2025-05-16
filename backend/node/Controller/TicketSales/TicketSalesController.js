var DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class

class TicketSalesController
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    } 

    async addSalesRecords(groupedRecords) {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Performance-Night-2025";
                var collectionName = "ticket_sales";
                var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, groupedRecords);
                console.log("Connected Database:", connectedDatabase);
                
                if (connectedDatabase.acknowledged === true) {
                    return {
                        success: true,
                        message: "New sales records created successfully",
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

    async getSalesRecords() {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Performance-Night-2025";  
                var collectionName = "ticket_sales";          
                var connectedDatabase = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);
                console.log("Connected Database:", connectedDatabase);

                // FIX: Check if data exists, not acknowledged
                if (connectedDatabase && connectedDatabase.data) {
                    return {
                        success: true,
                        message: "Sales records retrieved successfully",
                        data: connectedDatabase.data
                    };
                } else {
                    return {
                        success: false,
                        message: "No sales records found",
                        data: []
                    };
                }
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving sales records",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }
}

module.exports = TicketSalesController;
