module.exports = (mongoose) => {
  const Schema = mongoose.Schema;
  const analysisSchema = new mongoose.Schema(
    {
      contract: {
        type: String,
        ref: 'Contract',
        required: true
      },
      result: {
        type: String,
        required: true
      },
      abusiveClauses: [{
        type: String
      }],
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      },
      analysisDate: {
        type: Date,
        default: Date.now
      }
    },
    {
      timestamps: true,
    }
  );
  return mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema);
};
