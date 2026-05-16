const householdSkills = [
  "House Cleaning",
  "Deep Cleaning",
  "Move-in Cleaning",
  "Move-out Cleaning",
  "Kitchen Cleaning",
  "Bathroom Cleaning",
  "Carpet Cleaning",
  "Window Cleaning",
  "Laundry Service",
  "Ironing Service",
  "Dishwashing",
  "Home Organizing",
  "Decluttering",
  "Pantry Organization",
  "Garage Organization",
  "Closet Organization",
  "Furniture Assembly",
  "IKEA Assembly",
  "TV Mounting",
  "Curtain Installation",
  "Shelving Installation",
  "Picture Hanging",
  "Wall Patching",
  "Interior Painting",
  "Exterior Painting",
  "Wallpaper Installation",
  "Wallpaper Removal",
  "Tile Cleaning",
  "Grout Repair",
  "Caulking",
  "Plumbing Repair",
  "Faucet Installation",
  "Toilet Repair",
  "Drain Cleaning",
  "Leak Detection",
  "Water Heater Maintenance",
  "Electrical Repair",
  "Light Fixture Installation",
  "Outlet Installation",
  "Ceiling Fan Installation",
  "Appliance Installation",
  "Appliance Repair",
  "Refrigerator Repair",
  "Washing Machine Repair",
  "Dryer Repair",
  "Dishwasher Repair",
  "Oven Repair",
  "Microwave Repair",
  "Pest Control",
  "Termite Control",
  "Bed Bug Treatment",
  "Lawn Mowing",
  "Garden Maintenance",
  "Tree Trimming",
  "Hedge Trimming",
  "Weed Control",
  "Landscape Design",
  "Irrigation Repair",
  "Snow Removal",
  "Gutter Cleaning",
  "Roof Inspection",
  "Roof Repair",
  "Driveway Cleaning",
  "Pressure Washing",
  "Fence Repair",
  "Deck Repair",
  "Pool Cleaning",
  "Pool Maintenance",
  "Pet Sitting",
  "Dog Walking",
  "Pet Grooming",
  "Babysitting",
  "Elderly Care",
  "Meal Preparation",
  "Home Cooking",
  "Errand Running",
  "Grocery Shopping",
  "Moving Help",
  "Packing Service",
  "Unpacking Service",
  "Junk Removal",
  "Donation Pickup",
  "Handyman Service",
];

const engineeringSkills = [
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Structural Engineering",
  "Chemical Engineering",
  "Industrial Engineering",
  "Process Engineering",
  "Manufacturing Engineering",
  "Automation Engineering",
  "Robotics Engineering",
  "Control Systems Engineering",
  "Embedded Systems Engineering",
  "Electronics Engineering",
  "Power Systems Engineering",
  "HVAC Engineering",
  "Automotive Engineering",
  "Aerospace Engineering",
  "Biomedical Engineering",
  "Environmental Engineering",
  "Geotechnical Engineering",
  "Transportation Engineering",
  "Water Resources Engineering",
  "Renewable Energy Engineering",
  "Solar Systems Engineering",
  "Wind Energy Engineering",
  "Pipeline Engineering",
  "Instrumentation Engineering",
  "Telecommunications Engineering",
  "Network Engineering",
  "Software Engineering",
  "Data Engineering",
  "Machine Learning Engineering",
  "AI Engineering",
  "DevOps Engineering",
  "Cloud Engineering",
  "Cybersecurity Engineering",
  "Quality Engineering",
  "Reliability Engineering",
  "Safety Engineering",
  "Maintenance Engineering",
  "Project Engineering",
  "Site Engineering",
  "Mining Engineering",
  "Marine Engineering",
  "Petroleum Engineering",
  "Materials Engineering",
  "Metallurgical Engineering",
  "Mechatronics Engineering",
];

const levels = [
  "Junior",
  "Mid-Level",
  "Senior",
  "Lead",
  "Expert",
  "Certified",
];

const contexts = [
  "Residential",
  "Commercial",
  "Industrial",
  "On-site",
  "Remote",
  "Field",
  "Maintenance",
  "Installation",
  "Repair",
  "Inspection",
  "Troubleshooting",
  "Emergency",
];

const tools = [
  "AutoCAD",
  "SolidWorks",
  "Revit",
  "MATLAB",
  "PLC",
  "SCADA",
  "Python",
  "JavaScript",
  "TypeScript",
  "Node.js",
  "AWS",
  "Azure",
  "Docker",
  "Kubernetes",
];

function buildSkillCatalog(): string[] {
  const set = new Set<string>();

  for (const skill of householdSkills) set.add(skill);
  for (const skill of engineeringSkills) set.add(skill);

  for (const skill of householdSkills) {
    for (const context of contexts) {
      set.add(`${context} ${skill}`);
      set.add(`${skill} (${context})`);
    }
  }

  for (const skill of engineeringSkills) {
    for (const level of levels) {
      set.add(`${level} ${skill}`);
    }
    for (const context of contexts) {
      set.add(`${context} ${skill}`);
      set.add(`${skill} - ${context}`);
    }
    for (const tool of tools) {
      set.add(`${skill} with ${tool}`);
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export const SKILL_SUGGESTIONS = buildSkillCatalog();
