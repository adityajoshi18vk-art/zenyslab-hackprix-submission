export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  impact: 'positive' | 'negative' | 'mixed';
  isOverlooked: boolean;
  description: string;
  voiceQuote: string;
}

export interface SimulationRecord {
  id: string;
  decisionTitle: string;
  description: string;
  timestamp: string;
  stakeholders: Stakeholder[];
}

export const MOCK_SIMULATIONS: SimulationRecord[] = [
  {
    id: 'sim-1',
    decisionTitle: 'Mandatory 85% attendance policy for all courses',
    description: 'Requires all students to maintain at least 85% physical attendance to be eligible for final examinations, with no exceptions for internships.',
    timestamp: '2026-06-13T10:30:00Z',
    stakeholders: [
      {
        id: 'sh-1-1',
        name: 'Disabled Students',
        role: 'Students with physical or chronic health challenges',
        impact: 'negative',
        isOverlooked: true,
        description: 'Getting to campus daily is physically exhausting. Rigid rules make it impossible to handle health flare-ups without risking academic failure.',
        voiceQuote: 'Getting to campus daily is physically demanding. Some days my condition flares up, and having flexible attendance options is the difference between graduating and dropping out.',
      },
      {
        id: 'sh-1-2',
        name: 'Long-Distance Commuters',
        role: 'Students traveling >1.5 hours one-way',
        impact: 'negative',
        isOverlooked: true,
        description: 'Spend 3-4 hours daily in transit. Any delays or transport disruptions make meeting the strict 85% mark extremely stressful.',
        voiceQuote: 'I travel over two hours daily. Severe transit delays are common. This strict policy would penalize me for factors entirely out of my control and limit my internship opportunities.',
      },
      {
        id: 'sh-1-3',
        name: 'Working Students',
        role: 'Students balancing part-time jobs',
        impact: 'negative',
        isOverlooked: true,
        description: 'Need to work shifts to fund tuition and living expenses. Class timing conflicts directly threaten their financial stability.',
        voiceQuote: 'I work shifts to pay for my tuition. A rigid attendance rule forces me to choose between my job—which keeps me in school—and the classes themselves.',
      },
      {
        id: 'sh-1-4',
        name: 'Hostel/On-Campus Students',
        role: 'Students living in university dorms',
        impact: 'mixed',
        isOverlooked: false,
        description: 'Find it easy to attend class but face reduced peer engagement and collaboration since off-campus group members struggle to make it.',
        voiceQuote: 'Living on campus makes attendance easy for me. However, my project partners who commute are missing classes, which disrupts our teamwork and project timelines.',
      },
      {
        id: 'sh-1-5',
        name: 'Course Professors',
        role: 'Teaching staff and instructors',
        impact: 'positive',
        isOverlooked: false,
        description: 'Benefit from fuller classrooms and consistent student engagement, though they face increased administrative overhead validating sick leaves.',
        voiceQuote: 'Having full classrooms makes lectures much more engaging and structured. However, I now have to spend hours checking doctor notes, which is not what I want to do.',
      },
      {
        id: 'sh-1-6',
        name: 'Academic Toppers',
        role: 'High-performing students',
        impact: 'positive',
        isOverlooked: false,
        description: 'Value classroom interaction and structured lecture settings, which help maintain academic consistency and networking.',
        voiceQuote: 'I enjoy attending classes and participating in discussions. It helps me stay disciplined and get immediate feedback on my questions from instructors.',
      },
    ],
  },
  {
    id: 'sim-2',
    decisionTitle: 'Transitioning to a 100% cashless campus',
    description: 'Bans cash payments across all campus canteens, stationery shops, photocopying booths, and administrative services, requiring digital UPI/card payments only.',
    timestamp: '2026-06-12T14:15:00Z',
    stakeholders: [
      {
        id: 'sh-2-1',
        name: 'Contractual Staff & Canteen Workers',
        role: 'Non-payroll support staff',
        impact: 'negative',
        isOverlooked: true,
        description: 'Often paid in cash or rely on immediate cash tips. Many lack digital bank accounts or reliable smartphones to verify payments.',
        voiceQuote: 'Many of us in the canteens do not have smartphones or bank accounts linked to digital systems. Cash is how we buy daily groceries for our families.',
      },
      {
        id: 'sh-2-2',
        name: 'International Students',
        role: 'Foreign nationals studying on campus',
        impact: 'negative',
        isOverlooked: true,
        description: 'Struggle to set up local UPI payment accounts due to banking regulations. High foreign transaction fees on international cards make daily coffee expensive.',
        voiceQuote: 'Setting up UPI as an international student takes weeks of paperwork. Without cash, I could not even buy printing paper or lunch in my first month.',
      },
      {
        id: 'sh-2-3',
        name: 'Campus Administration',
        role: 'Finance and accounting office',
        impact: 'positive',
        isOverlooked: false,
        description: 'Eliminates cash handling risk, simplifies bookkeeping, and prevents financial leakage in canteens.',
        voiceQuote: 'Auditing campus accounts is ten times easier. We no longer have to collect physical cash bags or worry about discrepancies at the end of the day.',
      },
      {
        id: 'sh-2-4',
        name: 'Tech-Savvy Students',
        role: 'General student population',
        impact: 'positive',
        isOverlooked: false,
        description: 'Appreciate fast checkouts and not having to carry physical wallets or exact change.',
        voiceQuote: 'It is super convenient. I just scan the QR code and go. No more carrying coins or waiting for change from the vendor.',
      },
    ],
  },
  {
    id: 'sim-3',
    decisionTitle: 'Mandatory return-to-office 5 days a week',
    description: 'Eliminates hybrid work policies, requiring all engineering and support staff to work from physical office locations starting next month.',
    timestamp: '2026-06-10T09:00:00Z',
    stakeholders: [
      {
        id: 'sh-3-1',
        name: 'Working Parents & Caregivers',
        role: 'Employees with family responsibilities',
        impact: 'negative',
        isOverlooked: true,
        description: 'Lose crucial flexibility needed for school drop-offs and elder care, forcing high child-care expenses or career setbacks.',
        voiceQuote: 'Hybrid work let me manage preschool pickup without missing meetings. A full return-to-office means I either spend half my salary on daycare or resign.',
      },
      {
        id: 'sh-3-2',
        name: 'Neurodivergent Employees',
        role: 'Staff with sensory sensitivities or ADHD',
        impact: 'negative',
        isOverlooked: true,
        description: 'Struggle in open-plan office noise levels, experiencing sensory overload and reduced productivity compared to controlled home offices.',
        voiceQuote: 'The open office is constant noise, lights, and distractions. At home, I can focus and get my tasks done in half the time without sensory exhaustion.',
      },
      {
        id: 'sh-3-3',
        name: 'Junior Engineers',
        role: 'Recent graduates and interns',
        impact: 'mixed',
        isOverlooked: false,
        description: 'Benefit from spontaneous mentorship and organic networking, but struggle with high rent near the downtown office.',
        voiceQuote: 'I learn so much more sitting next to senior devs. But finding an affordable apartment within commuting distance of the city center is almost impossible.',
      },
      {
        id: 'sh-3-4',
        name: 'Executive Leadership',
        role: 'C-Suite and directors',
        impact: 'positive',
        isOverlooked: false,
        description: 'Believe physical collocation increases company culture, faster decision making, and justifies long-term office leases.',
        voiceQuote: 'Collaboration happens in hallways, not scheduled video calls. We need our people together to spark the next wave of innovation.',
      },
    ],
  },
];
