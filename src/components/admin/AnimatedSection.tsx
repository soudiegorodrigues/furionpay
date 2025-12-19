interface AnimatedSectionProps {
  children: React.ReactNode;
  sectionKey: string;
}

export function AnimatedSection({ children, sectionKey }: AnimatedSectionProps) {
  return (
    <div key={sectionKey} className="animate-fade-opacity">
      {children}
    </div>
  );
}
