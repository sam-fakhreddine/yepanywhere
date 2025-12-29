import { memo } from "react";

interface Props {
  text: string;
}

export const TextBlock = memo(function TextBlock({ text }: Props) {
  return <div className="text-block">{text}</div>;
});
