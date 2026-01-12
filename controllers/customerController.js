export const searchCustomer = async (req, res) => {
  const { customerNumber, loanType } = req.body;

  // MOCK / CORE BANKING INTEGRATION
  res.json({
    customerNumber,
    customerName: "John Doe",
    businessName: "Doe Enterprises",
    loanType,
  });
};
