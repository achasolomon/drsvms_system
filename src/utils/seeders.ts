import { User, ViolationType, VehicleOwner } from '../models';
import { logger } from './logger';

// Seed violation types (Nigerian traffic offenses)
export const seedViolationTypes = async () => {
  const violationTypes = [
    // Equipment Violations
    {
      code: 'EQ001',
      title: 'Missing Fire Extinguisher',
      description: 'Vehicle does not have a functional fire extinguisher',
      fineAmount: 5000.00,
      points: 1,
      category: 'equipment' as const,
      suspensionEligible: false,
    },
    {
      code: 'EQ002',
      title: 'Missing Warning Triangle',
      description: 'Vehicle does not have reflective warning triangles',
      fineAmount: 3000.00,
      points: 1,
      category: 'equipment' as const,
      suspensionEligible: false,
    },
    {
      code: 'EQ003',
      title: 'Missing First Aid Kit',
      description: 'Vehicle does not have a first aid kit',
      fineAmount: 4000.00,
      points: 1,
      category: 'equipment' as const,
      suspensionEligible: false,
    },
    {
      code: 'EQ004',
      title: 'Missing Spare Tire',
      description: 'Vehicle does not have a functional spare tire',
      fineAmount: 7000.00,
      points: 1,
      category: 'equipment' as const,
      suspensionEligible: false,
    },

    // Documentation Violations
    {
      code: 'DOC001',
      title: 'Driving Without Valid License',
      description: 'Driver does not have a valid driving license',
      fineAmount: 15000.00,
      points: 3,
      category: 'documentation' as const,
      suspensionEligible: true,
    },
    {
      code: 'DOC002',
      title: 'Expired Vehicle Registration',
      description: 'Vehicle registration has expired',
      fineAmount: 10000.00,
      points: 2,
      category: 'documentation' as const,
      suspensionEligible: false,
    },
    {
      code: 'DOC003',
      title: 'No Insurance Certificate',
      description: 'Vehicle does not have valid insurance',
      fineAmount: 8000.00,
      points: 2,
      category: 'documentation' as const,
      suspensionEligible: false,
    },
    {
      code: 'DOC004',
      title: 'No Road Worthiness Certificate',
      description: 'Vehicle lacks valid road worthiness certificate',
      fineAmount: 12000.00,
      points: 2,
      category: 'documentation' as const,
      suspensionEligible: false,
    },

    // Traffic Violations
    {
      code: 'TRF001',
      title: 'Speed Limit Violation',
      description: 'Exceeding posted speed limit',
      fineAmount: 20000.00,
      points: 4,
      category: 'traffic' as const,
      suspensionEligible: true,
    },
    {
      code: 'TRF002',
      title: 'Dangerous/Reckless Driving',
      description: 'Driving in a manner dangerous to other road users',
      fineAmount: 25000.00,
      points: 5,
      category: 'dangerous_driving' as const,
      suspensionEligible: true,
    },
    {
      code: 'TRF003',
      title: 'Traffic Light Violation',
      description: 'Failing to stop at red traffic light',
      fineAmount: 15000.00,
      points: 3,
      category: 'traffic' as const,
      suspensionEligible: false,
    },
    {
      code: 'TRF004',
      title: 'Wrong Way/One Way Violation',
      description: 'Driving against traffic flow on one-way road',
      fineAmount: 18000.00,
      points: 4,
      category: 'traffic' as const,
      suspensionEligible: true,
    },
    {
      code: 'TRF005',
      title: 'Illegal Overtaking',
      description: 'Overtaking in prohibited areas or unsafe manner',
      fineAmount: 12000.00,
      points: 3,
      category: 'traffic' as const,
      suspensionEligible: false,
    },

    // Parking Violations
    {
      code: 'PRK001',
      title: 'Illegal Parking',
      description: 'Parking in prohibited areas',
      fineAmount: 5000.00,
      points: 1,
      category: 'parking' as const,
      suspensionEligible: false,
    },
    {
      code: 'PRK002',
      title: 'Blocking Traffic',
      description: 'Vehicle obstructing traffic flow',
      fineAmount: 8000.00,
      points: 2,
      category: 'parking' as const,
      suspensionEligible: false,
    },

    // Vehicle Condition
    {
      code: 'VEH001',
      title: 'Defective Lighting System',
      description: 'Vehicle has non-functional lights',
      fineAmount: 6000.00,
      points: 1,
      category: 'vehicle_condition' as const,
      suspensionEligible: false,
    },
    {
      code: 'VEH002',
      title: 'Vehicle Overloading',
      description: 'Vehicle carrying excess passengers or cargo',
      fineAmount: 10000.00,
      points: 2,
      category: 'vehicle_condition' as const,
      suspensionEligible: false,
    },
    {
      code: 'VEH003',
      title: 'Worn Out Tires',
      description: 'Vehicle has dangerously worn tires',
      fineAmount: 8000.00,
      points: 2,
      category: 'vehicle_condition' as const,
      suspensionEligible: false,
    },
  ];

  try {
    for (const violationType of violationTypes) {
      await ViolationType.findOrCreate({
        where: { code: violationType.code },
        defaults: violationType,
      });
    }
    logger.info('Violation types seeded successfully');
  } catch (error) {
    logger.error('Error seeding violation types:', error);
    throw error;
  }
};

// Seed admin user
export const seedAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminExists) {
      const hashedPassword = await User.hashPassword('admin123');
      
      await User.create({
        employeeId: 'ADM001',
        email: 'admin@drsvms.gov.ng',
        passwordHash: hashedPassword,
        role: 'admin',
        fullName: 'System Administrator',
        phone: '+234-800-0000000',
        state: 'FCT',
        zone: 'Headquarters',
        unit: 'IT Department',
        rank: 'Chief Technology Officer',
      });
      
      logger.info('Admin user created successfully');
      logger.info('Default admin credentials: admin@drsvms.gov.ng / admin123');
    }
  } catch (error) {
    logger.error('Error seeding admin user:', error);
    throw error;
  }
};

// Seed sample officers
export const seedSampleOfficers = async () => {
  const officers = [
    {
      employeeId: 'OFF001',
      email: 'officer1@drsvms.gov.ng',
      password: 'officer123',
      fullName: 'Ibrahim Musa',
      phone: '+234-803-1234567',
      state: 'Lagos',
      zone: 'Lagos Island',
      unit: 'Traffic Division',
      rank: 'Inspector',
    },
    {
      employeeId: 'OFF002',
      email: 'officer2@drsvms.gov.ng',
      password: 'officer123',
      fullName: 'Fatima Abdullahi',
      phone: '+234-806-7890123',
      state: 'Kano',
      zone: 'Kano Central',
      unit: 'Highway Patrol',
      rank: 'Sergeant',
    },
    {
      employeeId: 'SUP001',
      email: 'supervisor1@drsvms.gov.ng',
      password: 'super123',
      fullName: 'Chukwu Okafor',
      phone: '+234-810-5555555',
      state: 'Anambra',
      zone: 'Awka Zone',
      unit: 'Operations',
      rank: 'Chief Inspector',
    },
  ];

  try {
    for (const officer of officers) {
      const exists = await User.findOne({ where: { employeeId: officer.employeeId } });
      
      if (!exists) {
        const hashedPassword = await User.hashPassword(officer.password);
        
        await User.create({
          employeeId: officer.employeeId,
          email: officer.email,
          passwordHash: hashedPassword,
          role: officer.employeeId.startsWith('SUP') ? 'supervisor' : 'officer',
          fullName: officer.fullName,
          phone: officer.phone,
          state: officer.state,
          zone: officer.zone,
          unit: officer.unit,
          rank: officer.rank,
        });
      }
    }
    logger.info('Sample officers created successfully');
  } catch (error) {
    logger.error('Error seeding officers:', error);
    throw error;
  }
};

// Seed sample vehicle owners
export const seedSampleVehicles = async () => {
  const vehicles = [
    {
      plateNumber: 'ABC-123-DE',
      licenseNumber: 'LIC123456789',
      fullName: 'Adebayo Johnson',
      address: '15, Allen Avenue, Ikeja, Lagos',
      phone: '+234-803-9876543',
      email: 'adebayo.johnson@email.com',
      stateOfResidence: 'Lagos',
      lga: 'Ikeja',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      vehicleYear: 2018,
      vehicleColor: 'Black',
      licenseClass: 'C' as const,
    },
    {
      plateNumber: 'XYZ-789-FG',
      licenseNumber: 'LIC987654321',
      fullName: 'Khadija Mohammed',
      address: '25, Ahmadu Bello Way, Kano',
      phone: '+234-806-1234567',
      email: 'khadija.mohammed@email.com',
      stateOfResidence: 'Kano',
      lga: 'Fagge',
      vehicleMake: 'Honda',
      vehicleModel: 'Accord',
      vehicleYear: 2020,
      vehicleColor: 'Silver',
      licenseClass: 'C' as const,
    },
    {
      plateNumber: 'PQR-456-HI',
      licenseNumber: 'LIC555666777',
      fullName: 'Emeka Okonkwo',
      address: '8, Zik Avenue, Awka, Anambra',
      phone: '+234-810-7777777',
      email: 'emeka.okonkwo@email.com',
      stateOfResidence: 'Anambra',
      lga: 'Awka South',
      vehicleMake: 'Mercedes',
      vehicleModel: 'C-Class',
      vehicleYear: 2019,
      vehicleColor: 'White',
      licenseClass: 'C' as const,
    },
  ];

  try {
    for (const vehicle of vehicles) {
      const exists = await VehicleOwner.findOne({ where: { plateNumber: vehicle.plateNumber } });
      
      if (!exists) {
        // Set issue and expiry dates
        const issueDate = new Date();
        issueDate.setFullYear(issueDate.getFullYear() - 2); // License issued 2 years ago
        
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 3); // License expires in 3 years
        
        await VehicleOwner.create({
          ...vehicle,
          issueDate,
          expiryDate,
        });
      }
    }
    logger.info('Sample vehicle owners created successfully');
  } catch (error) {
    logger.error('Error seeding vehicle owners:', error);
    throw error;
  }
};

// Main seeder function
export const runSeeders = async () => {
  try {
     const violationTypeCount = await ViolationType.count();
    const userCount = await User.count();

    if (violationTypeCount > 0 && userCount > 0) {
      console.log('Seed data already exists, skipping seeding...');
      return;
    }
    logger.info('Starting database seeding...');
    
    await seedViolationTypes();
    await seedAdminUser();
    await seedSampleOfficers();
    await seedSampleVehicles();
    
    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};