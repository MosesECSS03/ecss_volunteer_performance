const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string
const uri = 'mongodb+srv://MosesLee:Mlxy6695@performance-night-2025.xz1gndp.mongodb.net/?retryWrites=true&w=majority&appName=Performance-Night-2025'; // Use env variable

class DatabaseConnectivity {
    constructor() {
        this.client = new MongoClient(uri);
        this.isConnected = false;
    }

    // Connect to the database
    async initialize()
    {
        try 
        {
            if (!this.isConnected) 
            {
                await this.client.connect();
                this.isConnected = true;
                return "Connected to MongoDB Atlas!";
            }   
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            throw error;
        }
    }

    async insertToDatabase(dbname, collectionName, records)
    {
        const db = this.client.db(dbname); // Get the database object
        let result;
    
        try {
            if (db) {
                const table = db.collection(collectionName);
    
                // Directly insert the data without any checks
                if (Array.isArray(records)) 
                {
                result = await table.insertMany(records);
                } 
                else {
                result = await table.insertOne(records);
                }
                //console.log("Insert Result:", result);
                return { acknowledged: result.acknowledged }; 
            }
        } catch (error) {
            console.error('Error during database operation:', error);
            return { acknowledged: false, error: error.message }; // Return error status
        }
    }

    async retrieveFromDatabase(dbname, collectionName)
    {
        const db = this.client.db(dbname);
        let result;

        try {
            if (db) {
                const table = db.collection(collectionName);
                result = await table.find({}).toArray();
                //console.log("Retrieve Result:", result);
                return { acknowledged: true, data: result }; // Return the retrieved data
            }
        } catch (error) {
            console.error('Error during database operation:', error);
            return { acknowledged: false, error: error.message }; // Return error status
        }
    }

    // Close the connection to the database
    async close() {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            console.log("MongoDB connection closed.");
        }
    }
}



// Export the instance for use in other modules
module.exports = DatabaseConnectivity;