import { SearchParamProps } from "@/types"; // Assuming SearchParamProps is defined elsewhere

// Make the component async to properly handle dynamic searchParams
const Home = async ({ searchParams }: SearchParamProps) => {
  const isAdmin = searchParams?.admin === "true";

  return (
    <div className="flex h-screen max-h-screen">
      {/* Your existing content */}
      <h1>Welcome to Joan Healthcare OS</h1>
    </div>
  );
};
export default Home;