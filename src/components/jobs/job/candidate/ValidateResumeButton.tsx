
import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ValidateResumeButtonProps {
  isValidated: boolean;
  candidateId: number;
  onValidate: (candidateId: number) => void;
  isLoading?: boolean;
}

const ValidateResumeButton = ({
  isValidated,
  candidateId,
  onValidate,
  isLoading,
}: ValidateResumeButtonProps) => {
  return (
    <Button
      variant={isValidated ? "outline" : "default"}
      size="sm"
      onClick={() => !isValidated && onValidate(candidateId)}
      disabled={isValidated || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isValidated ? (
        <>
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Validated
        </>
      ) : (
        "Validate"
      )}
    </Button>
  );
};

export default ValidateResumeButton;
