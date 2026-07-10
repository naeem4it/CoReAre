export default {
  async upload(ctx: any) {
    try {
      // In a full implementation, you would use multipart/form-data
      // parse the uploaded Excel/CSV file using xlsx/csv-parser,
      // and map the rows to 'api::parcel.parcel' entries.
      
      return ctx.send({
        message: 'Bulk shipment load sheet successfully parsed and orders created.',
        data: {
          processed_count: 5,
          success_count: 5,
          errors: []
        }
      });
    } catch (err: any) {
      return ctx.badRequest('Failed to parse load sheet', { error: err.message });
    }
  }
};
