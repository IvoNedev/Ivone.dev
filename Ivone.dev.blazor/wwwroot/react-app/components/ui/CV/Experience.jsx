import React from 'react';

const jobs = [
    {
        company: "United Learning",
        location: "Peterborough, UK",
        period: "Mar 2018 - Present",
        title: "Full-Stack Web Developer",
        description: "A group of 100 schools improving education nationwide.",
        responsibilities: [
            "Led a team to build an industry-leading Curriculum SPA using .NET Core, MVC, SQL Server, React, and Azure apps.",
            "Reduced operation time by 15% by implementing new features.",
            "Developed an online education platform used by 60,000+ pupils during COVID.",
            "Expanded access for 10,000+ external teachers."
        ]
    },
    {
        company: "Quals-Direct",
        location: "Manchester, UK",
        period: "Aug 2014 - Mar 2018",
        title: "Software Developer",
        description: "Leading UK ePortfolio provider with 100,000+ learners.",
        responsibilities: [
            "Migrated legacy VB app to .NET MVC, reducing runtime by 50%.",
            "Resolved 45+ monthly feature requests & bugs, improving customer satisfaction.",
            "Enhanced security, preventing fraud for a key client."
        ]
    }
];

const Experience = () => {
    return (
        <section>
            <h2 className="professional-experience">PROFESSIONAL EXPERIENCE</h2>
            {jobs.map((job, index) => (
                <div className="job" key={index}>
                    <div className="job-heading">
                        <div className="job-title">
                            {job.company} <span className="job-location">{job.location}</span>
                        </div>
                        <div className="job-duration">{job.period}</div>
                    </div>
                    <div className="employer-description">{job.description}</div>
                    <div className="employer-position">{job.title}</div>
                    <ul className="job-points">
                        {job.responsibilities.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </div>
            ))}
        </section>
    );
};

export default Experience;
