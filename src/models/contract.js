// // contract.model.js

// module.exports = (mongoose) => {
//   const contractSchema = new mongoose.Schema(
//     {
//       user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',  // Make sure the 'User' model exists and is loaded
//         required: true
//       },
//       content: {
//         type: String,  // Or Text based on your use case
//         required: true
//       },
//       uploadDate: {
//         type: Date,
//         default: Date.now
//       },
//       status: {
//         type: String,
//         enum: ['pending', 'processed'],
//         default: 'pending'
//       },
//       analysis: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Analysis',
//         default: null
//       }
//     },
//     {
//       timestamps: true,
//     }
//   );
//   return mongoose.models.Contract || mongoose.model('Contract', contractSchema);
// };

// A remlacer par celui du haut quand login ...
// module.exports = (mongoose) => {
//   const contractSchema = new mongoose.Schema({
//     content: {
//       type: String,
//       required: true,
//     },
//   }, { collection: 'contracts' }); // Explicitly define the collection name

//   return mongoose.model('Contract', contractSchema);  // This will now use 'contracts' as the collection name
// };
/**
 * Contract model definition
 * This file defines the Contract schema and model for MongoDB
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (mongoose) => {
  const contractSchema = new mongoose.Schema(
    {
      _id: {
        type: String,
        default: uuidv4
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // required: true
      },
      content: {
        type: String,
        required: true
      },
      uploadDate: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['pending', 'processed'],
        default: 'pending'
      },
      // analysis: {
      //   type: String,
      //   ref: 'Analysis',
      //   default: null
      // }
    },
    {
      timestamps: true,
    }
  );

  // Add static methods to the schema
  contractSchema.statics.getContractFromDb = async function (id) {
    try {
      const contract = await this.findById(id).lean();
      if (!contract) return null;

      const analyses = await mongoose.model('Analysis').find({ contract: id }).lean();

      return {
        ...contract,
        analyses,
      };
    } catch (error) {
      console.error(`Error in getContractFromDb: ${error.message}`);
      throw error;
    }
  };

  return mongoose.models.Contract || mongoose.model('Contract', contractSchema);
};