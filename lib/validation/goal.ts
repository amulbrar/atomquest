import { z } from "zod"

export const uomTypes = ["numeric", "percent", "timeline", "zero"] as const
export const uomDirections = ["min", "max", "na"] as const

export const goalSchema = z
  .object({
    thrustAreaId: z.string().min(1, "Thrust area is required"),
    title: z.string().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().max(500).optional(),
    uomType: z.enum(uomTypes),
    uomDirection: z.enum(uomDirections),
    targetValue: z.string().optional(),
    targetDate: z.string().optional(),
    weightage: z
      .number()
      .int()
      .min(10, "Minimum weightage is 10%")
      .max(100, "Maximum weightage is 100%"),
  })
  .superRefine((data, ctx) => {
    if (data.uomType === "timeline") {
      if (!data.targetDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target date is required for Timeline goals",
          path: ["targetDate"],
        })
      }
    } else if (data.uomType !== "zero") {
      // numeric / percent need a target value
      if (!data.targetValue || data.targetValue.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target value is required",
          path: ["targetValue"],
        })
      } else if (isNaN(Number(data.targetValue))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target value must be a number",
          path: ["targetValue"],
        })
      }
    }
  })

export type GoalInput = z.infer<typeof goalSchema>

export const quarterUpdateSchema = z.object({
  goalId: z.string(),
  quarter: z.enum(["q1", "q2", "q3", "q4"]),
  actualValue: z.string().optional(),
  actualDate: z.string().optional(),
  status: z.enum(["not_started", "on_track", "completed"]),
  employeeNote: z.string().max(1000).optional(),
})

export type QuarterUpdateInput = z.infer<typeof quarterUpdateSchema>
