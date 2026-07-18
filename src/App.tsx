// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Route, Routes } from "react-router-dom";
// import { AppLayout } from "./components/layout/AppLayout";
// import BonL from "./pages/BonL";
// import BonR from "./pages/BonR";
// import BonS from "./pages/BonS";
// import Customer from "./pages/Customer";
// import Dashboard from "./pages/Dashboard";
// import HistoryL from "./pages/HistoryL";
// import HistoryR from "./pages/HistoryR";
// import HistoryS from "./pages/HistoryS";
// import NotFound from "./pages/NotFound";
// import Product from "./pages/Product";
// import Profile from "./pages/Profile";
// import { Toaster } from "./components/ui/toaster";

// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <BrowserRouter>
//       <Toaster />
//       <Routes>
//         <Route element={<AppLayout />}>
//           <Route path="/" element={<Dashboard />} />
//           <Route path="/Profile" element={<Profile />} />
//           <Route path="/customer" element={<Customer />} />
//           <Route path="/products" element={<Product />} />
//           <Route path="/bon-de-sortie" element={<BonS />} />
//           <Route path="/bon-de-livraison" element={<BonL />} />
//           <Route path="/bon-de-retour" element={<BonR />} />

//           <Route path="/history" element={<HistoryS />} />
//           <Route path="/historyLivraison" element={<HistoryL />} />
//           <Route path="/historyRetour" element={<HistoryR />} />
//         </Route>
//         <Route path="*" element={<NotFound />} />
//       </Routes>
//     </BrowserRouter>
//   </QueryClientProvider>
// );

// export default App;


// import { signUp } from "@/db/services/auth";

// function App() {

//   async function testSignUp() {
//     const result = await signUp(
//       "mhamdiyesser04@gmail.com",
//       "password123"
//     );

//     console.log(result);
//   }

//   return (
//     <div>
//       <button onClick={testSignUp}>
//         Test Signup
//       </button>
//     </div>
//   );
// }

// export default App;


import { useAuth } from "./context/AuthContext";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {user ? (
        <h1>
          Logged in: {user.email}
        </h1>
      ) : (
        <h1>
          Not logged in
        </h1>
      )}
    </div>
  );
}

export default App;