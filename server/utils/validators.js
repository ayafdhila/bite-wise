const { parsePhoneNumberFromString } = require("libphonenumber-js");

// Validate Email Format
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Validate Phone Number
const validatePhoneNumber = (countryCode, phoneNumber) => {
    const fullNumber = countryCode + phoneNumber;
    const parsedNumber = parsePhoneNumberFromString(fullNumber);
    return parsedNumber && parsedNumber.isValid();
};

module.exports = { validateEmail, validatePhoneNumber };
