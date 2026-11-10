package com.university.sgap.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "portal_sequences")
public class PortalSequence {

    @Id
    @Column(name = "seq_name", length = 64)
    private String seqName;

    @Column(name = "next_val", nullable = false)
    private int nextVal;

    public String getSeqName() {
        return seqName;
    }

    public void setSeqName(String seqName) {
        this.seqName = seqName;
    }

    public int getNextVal() {
        return nextVal;
    }

    public void setNextVal(int nextVal) {
        this.nextVal = nextVal;
    }
}

