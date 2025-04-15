import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MultiLocationSelector from "./MultiLocationSelector";
import SingleLocationSelector from "./SingleLocationSelector"; // Import new component
import { CandidateFormData } from "./AddCandidateDrawer";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface BasicInformationTabProps {
  form: UseFormReturn<CandidateFormData>;
  onSaveAndNext: (data: CandidateFormData) => void;
  onCancel: () => void;
}

// Revert to hard-coded locations
const LOCATION_OPTIONS = [
  "Delhi",
"Mumbai",
"Bangalore",
"Chennai",
"Kolkata",
"Hyderabad",
"Pune",
"Ahmedabad",
"Jaipur",
"Surat",
"Lucknow",
"Kanpur",
"Nagpur",
"Indore",
"Bhopal",
"Patna",
"Vadodara",
"Ludhiana",
"Agra",
"Nashik",
"Faridabad",
"Meerut",
"Rajkot",
"Kalyan",
"Vasai-Virar",
"Varanasi",
"Srinagar",
"Aurangabad",
"Dhanbad",
"Amritsar",
"Navi Mumbai",
"Allahabad",
"Ranchi",
"Howrah",
"Gwalior",
"Jabalpur",
"Coimbatore",
"Madurai",
"Visakhapatnam",
"Vijayawada",
"Chandigarh",
"Thiruvananthapuram",
"Kochi",
"Mysore",
"Jodhpur",
"Raipur",
"Dehradun",
"Guwahati",
"Hubli-Dharwad",
"Salem",
"Tiruchirappalli",
"Bhubaneshwar",
  "Remote",
  "Others",
];

const formatINR = (value: number): string => {
  const formattedNumber = new Intl.NumberFormat("en-IN").format(value);
  
  if (value >= 1_00_00_000) {
    return `${formattedNumber} (Crore)`;
  } else if (value >= 1_00_000) {
    return `${formattedNumber} (Lakh)`;
  } else if (value >= 1_000) {
    return `${formattedNumber} (Thousand)`;
  } else if (value >= 100) {
    return `${formattedNumber} (Hundred)`;
  }
  return `${formattedNumber}`;
};


const preprocessNumber = (val: unknown) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const number = Number(val);
  return isNaN(number) ? undefined : number;
};

const YEARS = Array.from({ length: 31 }, (_, i) => i.toString());
const MONTHS = Array.from({ length: 12 }, (_, i) => i.toString());

const basicInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone: z
    .string()
    .regex(/^\+\d{10,15}$/, "Phone number must include country code and be 10-15 digits")
    .min(1, "Phone number is required"),
  currentLocation: z.string().min(1, "Current location is required"),
  preferredLocations: z.array(z.string()).min(1, "At least one preferred location is required"),
  totalExperience: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative"))
    .optional(),
  totalExperienceMonths: z
    .preprocess(preprocessNumber, z.number().min(0).max(11, "Max 11 months"))
    .optional(),
  relevantExperience: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative"))
    .optional(),
  relevantExperienceMonths: z
    .preprocess(preprocessNumber, z.number().min(0).max(11, "Max 11 months"))
    .optional(),
  currentSalary: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative"))
    .optional(),
  expectedSalary: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative"))
    .optional(),
  resume: z.string().url("Resume URL is required"),
  skills: z.array(
    z.object({
      name: z.string(),
      rating: z.number(),
    })
  ),
  noticePeriod: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative").max(180, "Max 180 days"))
    .optional(),
  lastWorkingDay: z.string().optional(),
  linkedInId: z.string().url("Invalid LinkedIn URL").optional(),
  hasOffers: z.enum(["Yes", "No"]).optional(),
  offerDetails: z.string().optional(),
});

const BasicInformationTab = ({ form, onSaveAndNext, onCancel }: BasicInformationTabProps) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = `resumes/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from("candidate_resumes")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload Error:", error.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("candidate_resumes").getPublicUrl(filePath);

    if (publicUrl) {
      form.setValue("resume", publicUrl);
    }
  };

  const currentSalary = form.watch("currentSalary");
  const expectedSalary = form.watch("expectedSalary");
  const hasOffers = form.watch("hasOffers");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSaveAndNext)} className="space-y-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  First Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Last Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Phone Number <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <PhoneInput
                    international
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    value={field.value}
                    onChange={field.onChange}
                    className="border rounded-md p-2 w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currentLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Current Location <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <SingleLocationSelector
                    locations={LOCATION_OPTIONS}
                    selectedLocation={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferredLocations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Preferred Locations <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <MultiLocationSelector
                    locations={LOCATION_OPTIONS}
                    selectedLocations={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="totalExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Experience (years)</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select years" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalExperienceMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Experience (months)</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select months" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="relevantExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevant Experience (years)</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select years" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="relevantExperienceMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevant Experience (months)</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select months" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currentSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Salary</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Enter salary in INR"
                  />
                </FormControl>
                {currentSalary !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">₹ {formatINR(currentSalary)}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expectedSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Salary</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Enter salary in INR"
                  />
                </FormControl>
                {expectedSalary !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">₹ {formatINR(expectedSalary)}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="noticePeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notice Period (days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="180"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Enter days (e.g., 30)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastWorkingDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Working Day</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                    placeholder="Select date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="linkedInId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn Profile URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://linkedin.com/in/username"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hasOffers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Existing Offers</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {hasOffers === "Yes" && (
            <FormField
              control={form.control}
              name="offerDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Details</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter offer details"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        <FormField
          control={form.control}
          name="resume"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Resume <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
              </FormControl>
              {field.value && (
                <div className="flex items-center text-sm mt-1 gap-1">
                  <FileText size={16} className="purple-text-color" />
                  <a
                    href={field.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="purple-text-color underline"
                  >
                    View Resume
                  </a>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save & Next</Button>
        </div>
      </form>
    </Form>
  );
};

export default BasicInformationTab;