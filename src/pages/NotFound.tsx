
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestionIcon, HomeIcon } from "lucide-react";

const NotFound: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="container py-20 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <FileQuestionIcon className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl">404</CardTitle>
          <CardDescription className="text-xl">
            Page not found
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/">
            <Button>
              <HomeIcon className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
