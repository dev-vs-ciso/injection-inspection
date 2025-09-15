// Simple test script to verify basic setup
console.log('Testing Node.js TypeScript setup...');

try {
    // Test imports
    console.log('1. Testing basic imports...');
    
    console.log('2. Testing TypeORM import...');
    const typeorm = require('typeorm');
    console.log('   ✓ TypeORM imported successfully');
    
    console.log('3. Testing Express import...');
    const express = require('express');
    console.log('   ✓ Express imported successfully');
    
    console.log('4. Testing environment variables...');
    require('dotenv').config();
    console.log('   ✓ Environment loaded:', {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || '3000',
        bankName: process.env.BANK_NAME || 'Kerata-Zemke'
    });
    
    console.log('\n✅ All basic imports successful!');
    console.log('📝 Next: Try to compile and run the TypeScript app');
    
} catch (error) {
    console.error('❌ Error during testing:', error.message);
    process.exit(1);
}