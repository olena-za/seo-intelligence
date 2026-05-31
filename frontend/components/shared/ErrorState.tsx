import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorStateProps {
  title?: string;
  message: string;
}

export function ErrorState({ title = 'Something went wrong', message }: ErrorStateProps) {
  return (
    <Card className="border-rose-900/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}
