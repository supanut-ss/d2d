import { createRoot } from "react-dom/client";
import BusinessConceptPage from "./pages/BusinessConceptPage.jsx";
import "./styles/concept.css";

createRoot(document.getElementById("root")).render(
  <BusinessConceptPage app={document.body.dataset.tool} />
);
