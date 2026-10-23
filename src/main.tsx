import { createRoot } from "react-dom/client";
import RootApp from "./RootApp";
import "./i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(<RootApp/>);
