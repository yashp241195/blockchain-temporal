const crypto = require('crypto');

function getRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  }
  
  function getHash(prevHash, data) {
    const str = `${prevHash}-${JSON.stringify(data)}`;
    return crypto.createHash('sha256').update(str).digest('hex');
  }
  
  function validateData(data, validator) {
    for (const key in validator) {
      if (!(key in data)) {
        return false; 
      }
    }
    for (const key in validator) {
      if (!new RegExp(validator[key]).test(data[key])) {
        return false;
      }
    }
    return true;
  }

module.exports = { getRandomString, getHash, validateData }
