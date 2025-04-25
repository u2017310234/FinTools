interface GroupDiscussionResponse {
  content: string;
  role: string;
  timing: number;
}

// 定义不同角色的行为特征
const roleTraits = {
  leader: {
    initiativeLevel: 0.9,
    speakingFrequency: 0.8,
    collaborationLevel: 0.7
  },
  mediator: {
    initiativeLevel: 0.6,
    speakingFrequency: 0.5,
    collaborationLevel: 0.9
  },
  timekeeper: {
    initiativeLevel: 0.5,
    speakingFrequency: 0.4,
    collaborationLevel: 0.8
  },
  recorder: {
    initiativeLevel: 0.4,
    speakingFrequency: 0.3,
    collaborationLevel: 0.7
  }
};

const tools = {
  respond_to_discussion: {
    schema: {
      type: "object",
      properties: {
        currentTopic: {
          type: "string",
          description: "当前讨论的主题"
        },
        previousResponses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: { type: "string" },
              speaker: { type: "string" }
            }
          },
          description: "之前的发言记录"
        },
        timeRemaining: {
          type: "number",
          description: "剩余讨论时间（分钟）"
        },
        role: {
          type: "string",
          enum: ["leader", "mediator", "timekeeper", "recorder"],
          description: "扮演的角色"
        }
      },
      required: ["currentTopic", "previousResponses", "timeRemaining", "role"]
    },
    handler: async (args: any): Promise<GroupDiscussionResponse> => {
      const { currentTopic, previousResponses, timeRemaining, role } = args;
      const traits = roleTraits[role as keyof typeof roleTraits];

      // 根据角色特征生成响应
      let response = "";
      const randomFactor = Math.random();

      if (timeRemaining < 2 && role === "timekeeper") {
        response = "各位，我们还剩下不到两分钟的时间，建议开始总结我们的讨论成果。";
      } else if (previousResponses.length === 0 && randomFactor < traits.initiativeLevel) {
        response = generateInitialResponse(currentTopic, role);
      } else {
        response = generateFollowUpResponse(currentTopic, previousResponses, role, traits);
      }

      return {
        content: response,
        role: role,
        timing: calculateResponseTiming(traits.speakingFrequency)
      };
    }
  }
};

function generateInitialResponse(topic: string, role: string): string {
  switch (role) {
    case "leader":
      return `对于${topic}这个话题，我建议我们可以从以下几个方面展开讨论：第一...`;
    case "mediator":
      return `在讨论${topic}之前，也许我们可以先明确一下讨论的目标和预期达成的结果？`;
    case "timekeeper":
      return `考虑到我们有限的讨论时间，建议我们给${topic}的每个要点分配3-5分钟讨论时间。`;
    case "recorder":
      return `我会记录大家关于${topic}的观点，建议大家发言时可以突出关键信息。`;
    default:
      return "";
  }
}

function generateFollowUpResponse(
  topic: string,
  previousResponses: Array<{content: string, speaker: string}>,
  role: string,
  traits: {initiativeLevel: number, speakingFrequency: number, collaborationLevel: number}
): string {
  const lastResponse = previousResponses[previousResponses.length - 1];

  switch (role) {
    case "leader":
      return `基于${lastResponse.speaker}的观点，我们可以进一步探讨...`;
    case "mediator":
      return `${lastResponse.speaker}提出了很好的观点，也许我们可以听听其他同学对这点的看法？`;
    case "timekeeper":
      return `这个观点很有价值，建议我们用2分钟时间讨论这个方向，然后继续下一个话题。`;
    case "recorder":
      return `我已经记录下了${lastResponse.speaker}关于${topic}的观点，主要包括...`;
    default:
      return "";
  }
}

function calculateResponseTiming(speakingFrequency: number): number {
  // 根据发言频率特征，返回一个合适的发言时间点（秒）
  return Math.floor(10 + (1 - speakingFrequency) * 20);
}

// 导出MCP服务器配置
export default {
  tools,
  name: "leaderless-group-mcp",
  version: "1.0.0"
};
