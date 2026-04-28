import fs from 'fs';

const suffix = `
const SchoolContext = React.createContext<{
  courses: Course[],
  tracks: LearningTrack[],
  forumQuestions: ForumQuestion[],
  addCourse: (c: Course) => void,
  updateCourse: (c: Course) => void,
  deleteCourse: (id: string) => void,
  addTrack: (t: LearningTrack) => void,
  answerForumQuestion: (id: string, ans: string, isOfficial: boolean) => void
} | null>(null);

export function useSchool() {
  const ctx = React.useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [tracks, setTracks] = React.useState<LearningTrack[]>([]);
  const [forumQuestions, setForumQuestions] = React.useState<ForumQuestion[]>([]);

  const addCourse = (c: Course) => setCourses([...courses, c]);
  const updateCourse = (c: Course) => setCourses(courses.map(xc => xc.id === c.id ? c : xc));
  const deleteCourse = (id: string) => setCourses(courses.filter(c => c.id !== id));
  
  const addTrack = (t: LearningTrack) => setTracks([...tracks, t]);
  const answerForumQuestion = (id: string, ans: string, isOfficial: boolean) => setForumQuestions(forumQuestions.map(q => q.id === id ? { ...q, answer: ans, isOfficial } : q));

  return (
    <SchoolContext.Provider value={{
      courses, addCourse, updateCourse, deleteCourse,
      tracks, addTrack,
      forumQuestions, answerForumQuestion
    }}>
      {children}
    </SchoolContext.Provider>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState("home");
  const [isLoggedIn, setIsLoggedIn] = React.useState(true);
  const [userData] = React.useState({ name: "Admin", roles: ['admin'] });
  
  const renderView = () => {
     switch(activeTab) {
       case "home": return <HomeView />;
       case "admin": return <AdminView />;
       case "jornada": return <JornadaView />;
       case "pastors": return <PastorsView />;
       case "social": return <SocialView />;
       case "units": return <UnitsView />;
       case "media": return <SocialMediaView />;
       case "store": return <StoreView />;
       case "ministries": return <MinistriesView />;
       case "pastoral": return <PastoralCareView />;
       case "finance": return <FinanceView />;
       case "events": return <EventsView />;
       case "school": return <SchoolView />;
       case "members": return <MembersView />;
       case "cell": return <CellView isLoggedIn={isLoggedIn} isLeader={true} onTabChange={setActiveTab} userData={userData} />;
       default: return <HomeView />;
     }
  }
  
  return (
    <SchoolProvider>
      <CellProvider>
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} isLoggedIn={isLoggedIn} userRole="pastor" userData={userData}>
          {renderView()}
        </Layout>
      </CellProvider>
    </SchoolProvider>
  )
}
`;

fs.appendFileSync('src/App.tsx', suffix);
