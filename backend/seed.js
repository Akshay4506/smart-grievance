const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Complaint = require('./models/Complaint');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-grievance';

const citizens = [
    { name: 'Rahul Sharma', email: 'rahul@example.com', password: 'password123', role: 'citizen', phone: '9876543210' },
    { name: 'Priya Patel', email: 'priya@example.com', password: 'password123', role: 'citizen', phone: '9876543211' }
];

const officials = [
    { name: 'Amit Singh', email: 'amit.roads@gov.in', password: 'admin', role: 'official', department: 'Roads Department', phone: '9000000001' },
    { name: 'Sneha Gupta', email: 'sneha.water@gov.in', password: 'admin', role: 'official', department: 'Water Department', phone: '9000000002' }
];

const mockComplaints = [
    {
        title: 'Huge pothole on MG Road causing accidents',
        description: 'There is a massive pothole right in the middle of MG Road near the metro station. Two bikers fell yesterday.',
        category: 'Roads',
        severity: 'HIGH',
        departmentAssigned: 'Roads Department',
        status: 'IN_PROGRESS',
        location: { type: 'Point', coordinates: [77.5946, 12.9716], address: 'MG Road, Bengaluru' } // Bangalore
    },
    {
        title: 'Water pipe burst flooding the street',
        description: 'Main water supply line burst this morning. Entire street is flooded and water pressure is zero in our homes.',
        category: 'Water',
        severity: 'CRITICAL',
        departmentAssigned: 'Water Department',
        status: 'PENDING',
        location: { type: 'Point', coordinates: [77.2090, 28.6139], address: 'Connaught Place, New Delhi' } // Delhi
    },
    {
        title: 'Streetlights not working for a week',
        description: 'The streetlights from sector 4 to sector 5 are completely dead. It is very unsafe at night.',
        category: 'Electricity',
        severity: 'MEDIUM',
        departmentAssigned: 'Electricity Department',
        status: 'PENDING',
        location: { type: 'Point', coordinates: [72.8777, 19.0760], address: 'Andheri West, Mumbai' } // Mumbai
    },
    {
        title: 'Garbage dump overflowing near park',
        description: 'The community bin has not been cleared for 4 days. Strong foul smell reaching the children play area.',
        category: 'Waste',
        severity: 'MEDIUM',
        departmentAssigned: 'Waste Department',
        status: 'RESOLVED',
        location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'T Nagar, Chennai' } // Chennai
    }
];

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for seeding...');

        // Clear existing data
        await User.deleteMany();
        await Complaint.deleteMany();
        console.log('Database cleared.');

        // Insert Users
        const createdCitizens = [];
        for (const c of citizens) {
            const user = await User.create(c);
            createdCitizens.push(user);
        }

        for (const o of officials) {
            await User.create(o);
        }
        console.log('Users seeded successfully');

        // Insert Complaints
        const d = new Date();
        for (let i = 0; i < mockComplaints.length; i++) {
            const comp = mockComplaints[i];
            comp.citizenId = createdCitizens[i % createdCitizens.length]._id;

            let slaHours = 72;
            if (comp.severity === 'CRITICAL') slaHours = 4;
            if (comp.severity === 'HIGH') slaHours = 24;

            comp.slaDeadline = new Date(d.getTime() + slaHours * 60 * 60 * 1000);
            await Complaint.create(comp);
        }
        console.log('Complaints seeded successfully with Indian data');

        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
